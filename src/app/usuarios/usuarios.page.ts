import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  AlertController,
  ToastController,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  peopleOutline,
  personCircleOutline,
  saveOutline,
  trashOutline,
} from 'ionicons/icons';

import { environment } from '../../environments/environment';
import {
  AuthService,
  EstadoUsuario,
  RolUsuario,
  UsuarioAurora,
} from '../services/auth.service';

interface UsuarioListado extends UsuarioAurora {
  fecha_creacion?: string;
}

interface RespuestaListado {
  success: boolean;
  message?: string;
  total?: number;
  usuarios?: UsuarioListado[];
}

interface RespuestaConsulta {
  success: boolean;
  message?: string;
  usuario?: UsuarioListado;
}

interface RespuestaOperacion {
  success: boolean;
  message?: string;
  data?: unknown;
}

interface FormularioUsuario {
  codigo: string;
  nombre_usuario: string;
  rol: RolUsuario;
  correo: string;
  password: string;
  numero_control: string;
  id_docente: string;
  estado: EstadoUsuario;
}

type VistaUsuarios = 'lista' | 'formulario';
type FiltroEstado = 'Todos' | EstadoUsuario;

function formularioVacio(): FormularioUsuario {
  return {
    codigo: '',
    nombre_usuario: '',
    rol: 'Alumno',
    correo: '',
    password: '',
    numero_control: '',
    id_docente: '',
    estado: 'Activo',
  };
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonBackButton,
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonInputPasswordToggle,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class UsuariosPage {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly apiUrl = `${environment.apiUrl.replace(/\/$/, '')}/usuarios`;

  vista: VistaUsuarios = 'lista';
  usuarios: UsuarioListado[] = [];
  busqueda = '';
  filtroEstado: FiltroEstado = 'Todos';
  formulario: FormularioUsuario = formularioVacio();

  editando = false;
  cargando = false;
  cargandoDetalle = false;
  guardando = false;
  desactivando = false;
  errorListado = '';
  errorFormulario = '';

  // Si un administrador intenta modificar su propia cuenta, se impide
  // desactivarla accidentalmente desde esta pantalla.
  get esUsuarioActual(): boolean {
    return this.editando &&
      this.formulario.codigo === this.auth.obtenerUsuario()?.codigo;
  }

  get usuariosFiltrados(): UsuarioListado[] {
    const texto = this.busqueda.trim().toLocaleLowerCase();
    return this.usuarios.filter((usuario) => {
      if (this.filtroEstado !== 'Todos' && usuario.estado !== this.filtroEstado) {
        return false;
      }
      if (!texto) return true;
      return [usuario.codigo, usuario.nombre_usuario, usuario.correo, usuario.rol,
        usuario.numero_control ?? '', String(usuario.id_docente ?? '')]
        .some((campo) => campo.toLocaleLowerCase().includes(texto));
    });
  }

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      peopleOutline,
      personCircleOutline,
      saveOutline,
      trashOutline,
    });
  }

  ionViewWillEnter(): void {
    if (this.auth.obtenerUsuario()?.rol !== 'Admin') {
      void this.router.navigateByUrl('/home', { replaceUrl: true });
      return;
    }
    this.vista = 'lista';
    this.cargarUsuarios();
  }

  cargarUsuarios(refresher?: HTMLIonRefresherElement): void {
    this.errorListado = '';
    if (!refresher) this.cargando = true;

    this.http.get<RespuestaListado>(`${this.apiUrl}/listar.php`)
      .pipe(finalize(() => {
        this.cargando = false;
        void refresher?.complete();
      }))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.success || !Array.isArray(respuesta.usuarios)) {
            this.errorListado = respuesta.message || 'No se pudo cargar la lista.';
            return;
          }
          this.usuarios = respuesta.usuarios;
        },
        error: (error: HttpErrorResponse) => {
          this.errorListado = this.mensajeDeError(error);
        },
      });
  }

  refrescar(evento: Event): void {
    this.cargarUsuarios(evento.target as HTMLIonRefresherElement);
  }

  nuevoUsuario(): void {
    this.editando = false;
    this.errorFormulario = '';
    this.formulario = formularioVacio();
    this.vista = 'formulario';
  }

  abrirUsuario(usuario: UsuarioListado): void {
    if (this.cargandoDetalle) return;
    this.cargandoDetalle = true;
    this.errorListado = '';

    this.http.get<RespuestaConsulta>(`${this.apiUrl}/consultar.php`, {
      params: { codigo: usuario.codigo },
    }).pipe(finalize(() => this.cargandoDetalle = false))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.success || !respuesta.usuario) {
            this.errorListado = respuesta.message || 'No se pudo consultar el usuario.';
            return;
          }
          const detalle = respuesta.usuario;
          this.editando = true;
          this.errorFormulario = '';
          this.formulario = {
            codigo: detalle.codigo,
            nombre_usuario: detalle.nombre_usuario,
            rol: detalle.rol,
            correo: detalle.correo,
            password: '',
            numero_control: detalle.numero_control ?? '',
            id_docente: detalle.id_docente == null ? '' : String(detalle.id_docente),
            estado: detalle.estado,
          };
          this.vista = 'formulario';
        },
        error: (error: HttpErrorResponse) => {
          this.errorListado = this.mensajeDeError(error);
        },
      });
  }

  cambiarRol(): void {
    // Los campos de vinculación son mutuamente excluyentes.
    if (this.formulario.rol !== 'Alumno') this.formulario.numero_control = '';
    if (this.formulario.rol !== 'Docente') this.formulario.id_docente = '';
  }

  regresarLista(): void {
    if (this.guardando || this.desactivando) return;
    this.vista = 'lista';
    this.errorFormulario = '';
  }

  guardar(): void {
    if (this.guardando) return;
    this.errorFormulario = '';

    const f = this.formulario;
    const codigo = f.codigo.trim();
    const usuario = f.nombre_usuario.trim();
    const correo = f.correo.trim().toLowerCase();
    const numeroControl = f.numero_control.trim();
    const idDocenteTexto = f.id_docente.trim();
    const idDocenteNumero = Number(idDocenteTexto);

    if (!codigo || !usuario || !correo) {
      this.errorFormulario = 'Completa el código, nombre de usuario y correo.';
      return;
    }
    if (codigo.length > 30 || usuario.length > 50 || correo.length > 100) {
      this.errorFormulario = 'Alguno de los campos supera la longitud permitida.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      this.errorFormulario = 'Introduce un correo electrónico válido.';
      return;
    }
    if (this.esUsuarioActual && (f.rol !== 'Admin' || f.estado !== 'Activo')) {
      this.errorFormulario = 'No puedes cambiar tu propio rol o desactivar tu sesión.';
      return;
    }
    if (!this.editando && !f.password) {
      this.errorFormulario = 'La contraseña es obligatoria para un usuario nuevo.';
      return;
    }
    if (f.password && f.password.length < 8) {
      this.errorFormulario = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (f.rol === 'Alumno' && !numeroControl) {
      this.errorFormulario = 'Indica el número de control del alumno existente.';
      return;
    }
    if (f.rol === 'Docente' && (!/^\d+$/.test(idDocenteTexto) ||
        !Number.isSafeInteger(idDocenteNumero) || idDocenteNumero <= 0)) {
      this.errorFormulario = 'Introduce un ID de docente válido y existente.';
      return;
    }

    const datos = {
      codigo,
      nombre_usuario: usuario,
      rol: f.rol,
      correo,
      password: f.password, // En edición: vacío = conservar contraseña actual.
      numero_control: f.rol === 'Alumno' ? numeroControl : null,
      id_docente: f.rol === 'Docente' ? idDocenteNumero : null,
      ...(this.editando ? { estado: f.estado } : {}),
    };

    const endpoint = this.editando ? 'actualizar.php' : 'registrar.php';
    this.guardando = true;

    this.http.post<RespuestaOperacion>(`${this.apiUrl}/${endpoint}`, datos)
      .pipe(finalize(() => this.guardando = false))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.success) {
            this.errorFormulario = respuesta.message || 'No fue posible guardar el usuario.';
            return;
          }
          void this.mostrarMensaje(respuesta.message || 'Usuario guardado correctamente.');
          this.vista = 'lista';
          this.formulario.password = '';
          this.cargarUsuarios();
        },
        error: (error: HttpErrorResponse) => {
          this.errorFormulario = this.mensajeDeError(error);
        },
      });
  }

  async confirmarDesactivar(): Promise<void> {
    if (!this.editando || this.desactivando || this.esUsuarioActual ||
        this.formulario.estado === 'Inactivo') return;

    const confirmacion = await this.alertas.create({
      header: 'Desactivar usuario',
      message: `¿Deseas desactivar la cuenta ${this.formulario.nombre_usuario}? Podrás reactivarla al editar su estado.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: () => this.desactivar(),
        },
      ],
    });
    await confirmacion.present();
  }

  private desactivar(): void {
    this.desactivando = true;
    this.errorFormulario = '';
    this.http.post<RespuestaOperacion>(`${this.apiUrl}/eliminar.php`, {
      codigo: this.formulario.codigo,
    }).pipe(finalize(() => this.desactivando = false))
      .subscribe({
        next: (respuesta) => {
          if (!respuesta.success) {
            this.errorFormulario = respuesta.message || 'No fue posible desactivar.';
            return;
          }
          void this.mostrarMensaje(respuesta.message || 'Usuario desactivado.');
          this.vista = 'lista';
          this.cargarUsuarios();
        },
        error: (error: HttpErrorResponse) => {
          this.errorFormulario = this.mensajeDeError(error);
        },
      });
  }

  private mensajeDeError(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return 'Sin conexión con la API. Comprueba tu red o la dirección del servidor.';
    }
    const mensaje = error.error?.message;
    if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
    if (error.status === 409) return 'Ya existe un registro con esos datos.';
    return 'Ocurrió un error al comunicarse con el servidor.';
  }

  private async mostrarMensaje(mensaje: string): Promise<void> {
    const toast = await this.toasts.create({
      message: mensaje,
      duration: 2300,
      color: 'success',
      position: 'bottom',
    });
    await toast.present();
  }
}
