from slowapi import Limiter
from slowapi.util import get_remote_address

# Global limiter instance — key by IP address
limiter = Limiter(key_func=get_remote_address)
