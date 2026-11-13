import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export type RolUsuario = 'Admin' | 'Docente' | 'Alumno';
export type EstadoUsuario = 'Activo' | 'Inactivo' | 'Bloqueado';

export interface UsuarioAurora {
  codigo: string;
  nombre_usuario: string;
  rol: RolUsuario;
  correo: string;
  numero_control: string | null;
  id_docente: number | null;
  estado: EstadoUsuario;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data?: UsuarioAurora;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'aurora_usuario';
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  // Única fuente de verdad de la sesión en la aplicación.
  // La signal notifica al menú de Home inmediatamente después del login.
  private readonly estadoUsuario = signal<UsuarioAurora | null>(this.leerUsuario());
  readonly usuario = this.estadoUsuario.asReadonly();

  // Compatibilidad con las páginas y los guards previos.
  get usuarioActual(): UsuarioAurora | null {
    return this.estadoUsuario();
  }

  get autenticado(): boolean {
    return this.estaAutenticado();
  }

  login(correo: string, contra: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login.php`, {
      correo: correo.trim().toLowerCase(),
      contra,
    }, { withCredentials: true }).pipe(
      tap((respuesta) => {
        const usuario = respuesta.success && this.esUsuarioValido(respuesta.data)
          ? respuesta.data
          : null;

        if (usuario) {
          sessionStorage.setItem(this.storageKey, JSON.stringify(usuario));
          this.estadoUsuario.set(usuario);
        } else {
          this.cerrarSesion();
        }
      })
    );
  }

  obtenerUsuario(): UsuarioAurora | null {
    return this.estadoUsuario();
  }

  estaAutenticado(): boolean {
    return this.estadoUsuario() !== null;
  }

  cerrarSesion(): void {
    this.estadoUsuario.set(null);
    sessionStorage.removeItem(this.storageKey);
  }

  // Alias para versiones anteriores de Home.
  logout(): void {
    this.cerrarSesion();
  }

  private leerUsuario(): UsuarioAurora | null {
    try {
      const valor = sessionStorage.getItem(this.storageKey);
      if (!valor) return null;

      const usuario: unknown = JSON.parse(valor);
      if (this.esUsuarioValido(usuario)) return usuario;

      sessionStorage.removeItem(this.storageKey);
      return null;
    } catch {
      sessionStorage.removeItem(this.storageKey);
      return null;
    }
  }

  private esUsuarioValido(valor: unknown): valor is UsuarioAurora {
    if (!valor || typeof valor !== 'object') return false;
    const u = valor as Partial<UsuarioAurora>;

    return typeof u.codigo === 'string' && u.codigo.trim().length > 0 &&
      typeof u.nombre_usuario === 'string' &&
      typeof u.correo === 'string' &&
      (u.rol === 'Admin' || u.rol === 'Docente' || u.rol === 'Alumno') &&
      u.estado === 'Activo';
  }
}
