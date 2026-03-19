export function roleLabel(role: string): string {
  switch (role) {
    case 'workspace_admin':
      return 'مدير';
    case 'workspace_member':
      return 'عضو';
    default:
      return role;
  }
}
