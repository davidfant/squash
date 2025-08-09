

class AuthError(Exception):
    pass


def verify_secret(request, env) -> bool:
    secret = getattr(env, "INTERNAL_SHARED_SECRET", None)
    if not secret:
        return False
    return request.headers.get("x-internal-secret") == secret
