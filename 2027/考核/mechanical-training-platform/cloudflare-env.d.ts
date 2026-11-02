declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    INITIAL_STUDENT_ROSTER?: string;
    PLATFORM_OWNER_USER_ID?: string;
  }
}
