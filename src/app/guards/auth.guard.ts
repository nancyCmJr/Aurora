import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// Protege la navegación dentro de Ionic; NO autoriza peticiones a la API PHP.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.estaAutenticado()
    ? true
    : router.createUrlTree(['/login']);
};
