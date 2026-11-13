import { Injectable, inject } from '@angular/core';
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
  private readonly usuarioKey = 'aurora_usuario';
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  login(correo: string, contra: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login.php`, {
      correo,
      contra,
    }).pipe(
      tap((respuesta) => {
        if (respuesta.success && respuesta.data?.estado === 'Activo') {
          sessionStorage.setItem(this.usuarioKey, JSON.stringify(respuesta.data));
        } else {
          this.cerrarSesion();
        }
      })
    );
  }

  obtenerUsuario(): UsuarioAurora | null {
    const guardado = sessionStorage.getItem(this.usuarioKey);
    if (!guardado) return null;

    try {
      const usuario = JSON.parse(guardado) as Partial<UsuarioAurora>;
      if (
        usuario.estado === 'Activo' &&
        (usuario.rol === 'Admin' || usuario.rol === 'Docente' || usuario.rol === 'Alumno') &&
        typeof usuario.codigo === 'string' &&
        typeof usuario.correo === 'string'
      ) {
        return usuario as UsuarioAurora;
      }
    } catch {
      // Dato local inválido: se elimina.
    }
    this.cerrarSesion();
    return null;
  }

  estaAutenticado(): boolean {
    return this.obtenerUsuario() !== null;
  }

  cerrarSesion(): void {
    sessionStorage.removeItem(this.usuarioKey);
  }
}
