'use client';

// La bottom nav se superpose à la page (pas de padding réservé).
// Les pages qui ont besoin d'éviter le recouvrement peuvent ajouter leur propre pb.
export default function NavPadding({ children }) {
  return (
    <div className="h-full">
      {children}
    </div>
  );
}
