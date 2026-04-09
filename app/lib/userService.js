export async function fetchUserProfile(userId) {
  if (!userId) return null;
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (user)');
  }
  return res.json();
}

export async function createUserProfile(profile) {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (create user)');
  }
  return res.json();
}

export async function updateUserProfile(userId, patch) {
  const res = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Erreur serveur (update user)');
  }
  return res.json();
}