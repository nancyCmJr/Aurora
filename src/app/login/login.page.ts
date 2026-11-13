import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonList,
  IonNote,
  IonSpinner,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { logInOutline, schoolOutline } from 'ionicons/icons';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonList,
    IonNote,
    IonSpinner,
  ],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  correo = '';
  contra = '';
  cargando = false;
  mensajeError = '';

  constructor() {
    addIcons({ logInOutline, schoolOutline });
  }

  iniciarSesion(): void {
    if (this.cargando) return;

    this.mensajeError = '';
    const correo = this.correo.trim().toLowerCase();

    if (!correo || !this.contra) {
      this.mensajeError = 'Ingresa tu correo y contraseña.';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      this.mensajeError = 'Escribe un correo electrónico válido.';
      return;
    }

    this.cargando = true;
    this.auth.login(correo, this.contra)
      .pipe(finalize(() => (this.cargando = false)))
      .subscribe({
        next: (respuesta) => {
          if (respuesta.success && respuesta.data?.estado === 'Activo') {
            this.contra = '';
            void this.router.navigateByUrl('/home', { replaceUrl: true });
          } else {
            this.mensajeError = respuesta.message || 'No fue posible iniciar sesión.';
          }
        },
        error: (error: HttpErrorResponse) => {
          if (error.status === 0) {
            this.mensajeError = 'No se pudo conectar con el servidor. Revisa tu conexión.';
          } else {
            const mensaje = error.error?.message;
            this.mensajeError = typeof mensaje === 'string'
              ? mensaje
              : 'No fue posible iniciar sesión. Inténtalo de nuevo.';
          }
        },
      });
  }
}
