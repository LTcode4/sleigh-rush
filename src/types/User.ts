export interface User {
  provider: string;
  id: string;
  name: string;
  avatarUrl?: string;
}
export interface LineUser extends User {
  provider: 'line';
}
