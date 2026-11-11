import os
from pathlib import Path
from ultralytics import YOLO
import shutil
from app.core.config import settings
import pandas as pd
from sqlmodel import Session, select
import datetime
from .models import Outputmodel
from app.core.database import engine
from app.domains.project.model import Project_setting , Projects
import json
import threading
training_lock = threading.Lock()

def prepare_dataset(project_id:str,base_model_type :str, conf_threshold: float, proc_mode: str)-> str:
    project_dir = settings.UPLOAD_DIR / project_id
    #  เตรียม dataset สำหรับการเทรน
    yolo_dataset = project_dir / "yolo_dataset"
    yaml_path = yolo_dataset / "data.yaml"

    # สร้าง โฟลเดอร์สำหรับ yolo
    images_dir = yolo_dataset / "images"
    labels_dir = yolo_dataset / "labels"
    images_dir.mkdir(parents=True, exist_ok=True)
    labels_dir.mkdir(parents=True, exist_ok=True)

    classes = [d.name for d in project_dir.iterdir() if d.is_dir() and d.name != "yolo_dataset"]
    if len(classes) == 0:
        raise ValueError("ไม่พบโฟลเดอร์หมวดหมู่รูปภาพ! กรุณาสร้างโฟลเดอร์และนำรูปภาพใส่ไว้ข้างในก่อนกดเทรน")
    all_source_images =[]
    for cls_name in classes:
        class_dir = project_dir / cls_name
        all_source_images.extend(list(class_dir.glob("*.*")))
         
    total_images_count = len([f for f in all_source_images if f.suffix.lower() in [".jpg", ".jpeg", ".png"]])
    if yolo_dataset.exists() and yaml_path.exists():
        prepared_images_count = len(list((yolo_dataset / "images").glob("*.*")))
        if total_images_count == prepared_images_count:
            print(f"[{project_id}] ⚡ ข้อมูลถูกเตรียมไว้แล้ว (จำนวนรูปเท่าเดิม) กระโดดไปเทรนโมเดลเลย!")
            return str(yaml_path)
    # โหลด mainmodel
    if base_model_type == "advanced" or proc_mode == "Batch":
        model = YOLO("yolov8s-world.pt")
        
        model.set_classes(classes)
    else:
        model = YOLO("yolov8s.pt")
    
    
    for idx,class_name in enumerate(classes):
        class_dir = project_dir / class_name

        for img_file in class_dir.glob("*.*"):
            if img_file.suffix.lower() not in [".jpg", ".jpeg", ".png"]:
                continue

            # คัดลอกภาพไปยังโฟลเดอร์ images
            results =  model.predict(source=str(img_file),conf=conf_threshold,save=False,verbose=False)

            # สร้างไฟล์ label สำหรับแต่ละภาพ
            dest_img_file = images_dir / f"{class_name}_{img_file.name}"
            if not dest_img_file.exists():
                os.symlink(img_file.resolve(),dest_img_file.resolve())
            
            label_path = labels_dir / f"{class_name}_{img_file.stem}.txt"
            with open(label_path,"w") as f:
                for result in results:
                    boxes = result.boxes.xywhn
                    cls_ids = result.boxes.cls

                    for box,cls_id in zip(boxes,cls_ids):
                        if base_model_type == "advanced" or proc_mode == "Batch":
                            # YOLO-World automatically maps to 0, 1, 2...
                            f.write(f"{int(cls_id)} {box[0]:.6f} {box[1]:.6f} {box[2]:.6f} {box[3]:.6f}\n")
                        else:
                            # For standard YOLO, map COCO class name to our dataset index
                            coco_name = model.names[int(cls_id)]
                            if coco_name in classes:
                                mapped_id = classes.index(coco_name)
                                f.write(f"{mapped_id} {box[0]:.6f} {box[1]:.6f} {box[2]:.6f} {box[3]:.6f}\n")
                            # Ignore detections that don't match our target classes

    # สร้าง data.yaml สำหรับเทรน
    
    images_full_path = str(images_dir.resolve()).replace("\\", "/")
    dataset_full_path = str(yolo_dataset.resolve()).replace("\\", "/")
    yaml_lines = [
            f"path: '{dataset_full_path}'",
            f"train: '{images_full_path}'",
            f"val: '{images_full_path}'",
            "names:"
        ]
    for i, name in enumerate(classes):
        yaml_lines.append(f"  {i}: '{name}'")
    
    yaml_text = "\n".join(yaml_lines)
    with open(yaml_path, "w",encoding="utf-8") as f:
        f.write(yaml_text)

    return str(yaml_path)        


def train_model(project_id:str,yaml_path:str,proc_mode:str):

    model = YOLO("yolov8s.pt")
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    run_name = f"run_{timestamp}_{project_id}"
    project_run_dir = settings.UPLOAD_DIR / project_id / run_name
    
    if proc_mode == "Realtime":
        train_epochs = 3
        train_imgsz = 416
    else:
        train_epochs = 4
        train_imgsz = 416
    results = model.train(
        data=yaml_path,
        epochs=train_epochs,
        patience=15,
        imgsz=train_imgsz,
        project=str(settings.UPLOAD_DIR / project_id),
        name=run_name,
        exist_ok=False,
        amp=False
    )

    last_pt_path = project_run_dir / "weights" / "last.pt"
    if last_pt_path.exists():
        last_pt_path.unlink() 

    model_path = str(project_run_dir / "weights"/ "best.pt")
    process_at = datetime.datetime.now()
    latest_accuracy = float(results.box.map50)
    compute_efficiency_ms = float(results.speed.get('inference', 0.0)) if hasattr(results, 'speed') else 0.0
    model.export(format="onnx")
    onnx_path = str(project_run_dir / "weights"/ "best.onnx")

    csv_path = project_run_dir / "results.csv"
    loss_variance = 0.0
    accuracy_history = []
    if csv_path.exists():
        df = pd.read_csv(csv_path)
        df.columns = df.columns.str.strip()
        if 'train/box_loss' in df.columns:
            loss_variance = float(df['train/box_loss'].iloc[-1])
        if 'metrics/mAP50(B)' in df.columns:
                accuracy_history = df['metrics/mAP50(B)'].tolist()
            
        new_output = Outputmodel(
            project_id=project_id,
            model_path=model_path,
            onnx_model_path=onnx_path,
            process_at=process_at,
            latest_accuracy=latest_accuracy,
            compute_efficiency_ms=compute_efficiency_ms,
            loss_variance=loss_variance,
            accuracy_history=accuracy_history,
            run_id = run_name
        )
            

        with Session(engine) as  session:
            
            session.add(new_output)
            session.commit()
        #  difine best top 3 model อ้างอิงจาก latest_accuracy

            statement = select(Outputmodel).where(
                Outputmodel.project_id == project_id
            ).order_by(Outputmodel.latest_accuracy.desc())


            all_models = session.exec(statement).all()

            if len(all_models) > 3 :

                model_to_delete = all_models[3:]
                for bad_model in model_to_delete:
                    target = Path(bad_model.model_path)
                    run_folder_to_delete = target.parent.parent
                    if run_folder_to_delete.exists() and run_folder_to_delete.is_dir():
                        shutil.rmtree(run_folder_to_delete)
                    session.delete(bad_model)
                session.commit()

def process_ai_pipeline(project_id: str, base_model_type: str):
    
    with Session(engine) as session:
          project = session.get(Projects,project_id)
          if not project:
                return
          project.is_training = True
          session.commit()
    with training_lock:
        try:
            conf_threshold = 0.25 
            proc_mode = "Batch"

            with Session(engine) as session:
                statement = select(Project_setting).where(Project_setting.project_id == project_id)
                db_settings = session.exec(statement).first() 
                if db_settings:
                    conf_threshold = db_settings.threshold
                    proc_mode = db_settings.processing_mode

            print(f"[{project_id}] เริ่มการเตรียมข้อมูลด้วย {base_model_type}...")
            yaml_path = prepare_dataset(project_id, base_model_type, conf_threshold, proc_mode)
            
            print(f"[{project_id}] เริ่มการเทรนโมเดล...")
            train_model(project_id, yaml_path,proc_mode)
            
            print(f"[{project_id}] เทรนสำเร็จ! โมเดลพร้อมใช้งาน")
        except Exception as e:

            print(f"[{project_id}] Error: {str(e)}")
            with Session(engine) as session:
                project = session.get(Projects, project_id)
                if project:
                    project.is_training = False
                    session.commit()
        finally:
            with Session(engine) as session:
                project = session.get(Projects, project_id)
                if project:
                    project.is_training = False
                    session.commit()
            print(f"[{project_id}] คืนสถานะโปรเจกต์เป็นปกติ")