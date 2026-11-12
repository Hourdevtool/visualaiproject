"use client";
import React from 'react';
import { SessionProvider } from 'next-auth/react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH 
  ? `${process.env.NEXT_PUBLIC_BASE_PATH}/api/auth` 
  : '/api/auth';

const AuthProvider = ({children}:{children: React.ReactNode}) => {
  return (
    <SessionProvider basePath={basePath} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
};

export default AuthProvider;
