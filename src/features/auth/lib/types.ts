/** Usuario autenticado disponible en `locals.currentUser` durante un request. */
export interface SessionUser {
  id: string;
  email: string;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  timezone: string | null;
}
