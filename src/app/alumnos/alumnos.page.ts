
import { ChangeDetectorRef, Component, inject } from '@angular/core';
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
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
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
  createOutline,
  personOutline,
  saveOutline,
  trashOutline,
} from 'ionicons/icons';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// ========================================
// TIPOS E INTERFACES
// ========================================

type EstadoAlumno =
  | 'Activo'
  | 'Baja temporal'
  | 'Baja definitiva'
  | 'Egresado'
  | 'Titulado';

type Vista = 'lista' | 'detalle' | 'formulario';
type Filtro = 'Todos' | EstadoAlumno;

interface Alumno {
  numero_control: string;
  nombre: string;
  seg_nombre?: string | null;
  apellidos: string;
  semestre: number;
  estado: EstadoAlumno;

  fecha_registro?: string | null;
  id_carrera?: number | null;
  carrera?: string | null;
  tipo_carrera?: string | null;

  id_inscripciones?: number | null;
  estado_inscripcion?: string | null;
  fecha_inscripcion?: string | null;

  curp?: string | null;
  fecha_nacimiento?: string | null;
  telefono?: string | null;
  email?: string | null;

  calle?: string | null;
  numero_exterior?: string | null;
  numero_interior?: string | null;
  colonia?: string | null;
  codigo_postal?: string | null;
  municipio?: string | null;
  referencias?: string | null;

  datos_contacto?: string | null;
  situacion_academica?: string | null;
  fecha_ingreso?: string | null;
}

interface Carrera {
  id_carrera: number;
  nombre: string;
  estado?: string;
}

interface RespuestaApi<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface RespuestaCarreras extends RespuestaApi<Carrera[]> {
  carreras?: Carrera[];
}

interface DetalleAlumno {
  curp: string;
  fecha_nacimiento: string;
  telefono: string;
  email: string;

  calle: string;
  numero_exterior: string;
  numero_interior: string;
  colonia: string;
  codigo_postal: string;
  municipio: string;
  estado: string;

  referencias: string;
  datos_contacto: string;
  situacion_academica: string;
  fecha_ingreso: string;
}

interface FormularioAlumno {
  numero_control: string;
  nombre: string;
  seg_nombre: string;
  apellidos: string;
  semestre: number;
  estado: EstadoAlumno;
  id_carrera: number | null;
  detalle: DetalleAlumno;
}

// ========================================
// FORMULARIO INICIAL
// ========================================

function nuevoFormulario(): FormularioAlumno {
  return {
    numero_control: '',
    nombre: '',
    seg_nombre: '',
    apellidos: '',
    semestre: 1,
    estado: 'Activo',
    id_carrera: null,

    detalle: {
      curp: '',
      fecha_nacimiento: '',
      telefono: '',
      email: '',
      calle: '',
      numero_exterior: '',
      numero_interior: '',
      colonia: '',
      codigo_postal: '',
      municipio: '',
      estado: '',
      referencias: '',
      datos_contacto: '',
      situacion_academica: '',
      fecha_ingreso: '',
    },
  };
}

// ========================================
// COMPONENTE
// ========================================

@Component({
  selector: 'app-alumnos',
  standalone: true,
  templateUrl: './alumnos.page.html',
  styleUrls: ['./alumnos.page.scss'],

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
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})

export class AlumnosPage {

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly api =
    environment.apiUrl.replace(/\/$/, '');

  // ======================================
  // VARIABLES DE LA PÁGINA
  // ======================================

  vista: Vista = 'lista';

  filtro: Filtro = 'Todos';
  busqueda = '';

  alumnos: Alumno[] = [];
  carreras: Carrera[] = [];

  seleccionado: Alumno | null = null;
  formulario: FormularioAlumno = nuevoFormulario();

  editando = false;
  cargando = false;
  cargandoDetalle = false;
  cargandoCarreras = false;
  guardando = false;
  eliminando = false;

  errorLista = '';
  errorFormulario = '';
  errorCarreras = '';

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      createOutline,
      personOutline,
      saveOutline,
      trashOutline,
    });
  }

  // ======================================
  // BÚSQUEDA Y FILTROS
  // ======================================

  get alumnosFiltrados(): Alumno[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.alumnos.filter(alumno => {

      if (
        this.filtro !== 'Todos' &&
        alumno.estado !== this.filtro
      ) {
        return false;
      }

      if (!texto) return true;

      return [
        alumno.numero_control,
        alumno.nombre,
        alumno.seg_nombre,
        alumno.apellidos,
        alumno.carrera,
      ].some(valor =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      );

    });
  }

  nombreCompleto(alumno: Alumno): string {

    return [
      alumno.nombre,
      alumno.seg_nombre,
      alumno.apellidos,
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ======================================
  // ENTRADA A LA PÁGINA
  // ======================================

  ionViewWillEnter(): void {

    // Solo administradores
    if (this.auth.obtenerUsuario()?.rol !== 'Admin') {

      void this.router.navigateByUrl('/home', {
        replaceUrl: true,
      });

      return;
    }

    this.vista = 'lista';

    this.cargarAlumnos();
    this.cargarCarreras();
  }

  // ======================================
  // LISTAR ALUMNOS
  // GET: alumnos/listar.php
  // ======================================

  cargarAlumnos(
    refresher?: HTMLIonRefresherElement
  ): void {

    this.errorLista = '';

    if (!refresher) {
      this.cargando = true;
    }

    this.http.get<RespuestaApi<Alumno[]>>(
      `${this.api}/alumnos/listar.php`,
      {
        withCredentials: true,
      }
    )
    .pipe(
      finalize(() => {

        this.cargando = false;

        void refresher?.complete();

        this.cdr.markForCheck();
      })
    )
    .subscribe({

      next: respuesta => {

        if (
          !respuesta.success ||
          !Array.isArray(respuesta.data)
        ) {

          this.errorLista =
            respuesta.message ||
            'No fue posible cargar los alumnos.';

          return;
        }

        this.alumnos = respuesta.data;

        this.cdr.markForCheck();
      },

      error: error => {

        this.errorLista = this.mensajeError(error);

      },

    });
  }

  refrescar(evento: Event): void {

    this.cargarAlumnos(
      evento.target as HTMLIonRefresherElement
    );
  }

  // ======================================
  // OBTENER CARRERAS
  // GET: carreras/listar.php
  // ======================================

  cargarCarreras(): void {

    this.cargandoCarreras = true;
    this.errorCarreras = '';

    this.http.get<RespuestaCarreras>(
      `${this.api}/carreras/listar.php`,
      {
        withCredentials: true,
      }
    )
    .pipe(
      finalize(() => {

        this.cargandoCarreras = false;
        this.cdr.markForCheck();

      })
    )
    .subscribe({

      next: respuesta => {

        const opciones = Array.isArray(respuesta.carreras)
          ? respuesta.carreras
          : respuesta.data;

        if (
          !respuesta.success ||
          !Array.isArray(opciones)
        ) {

          this.errorCarreras =
            respuesta.message ||
            'No se pudieron consultar las carreras.';

          return;
        }

        this.carreras = opciones;

        this.cdr.markForCheck();
      },

      error: error => {

        this.errorCarreras = this.mensajeError(error);

      },

    });
  }

  // ======================================
  // CONSULTAR EXPEDIENTE
  // GET: alumnos/consultar.php
  // ======================================

  abrirDetalle(alumno: Alumno): void {

    if (this.cargandoDetalle) return;

    this.cargandoDetalle = true;
    this.errorLista = '';

    this.http.get<RespuestaApi<Alumno>>(
      `${this.api}/alumnos/consultar.php`,
      {
        params: {
          numero_control: alumno.numero_control,
        },
        withCredentials: true,
      }
    )
    .pipe(
      finalize(() => {

        this.cargandoDetalle = false;
        this.cdr.markForCheck();

      })
    )
    .subscribe({

      next: respuesta => {

        if (!respuesta.success || !respuesta.data) {

          this.errorLista =
            respuesta.message ||
            'No se pudo abrir el expediente.';

          return;
        }

        this.seleccionado = respuesta.data;

        this.vista = 'detalle';

        this.cdr.markForCheck();
      },

      error: error => {

        this.errorLista = this.mensajeError(error);

      },

    });
  }

  // ======================================
  // NUEVO ALUMNO
  // ======================================

  nuevo(): void {

    this.formulario = nuevoFormulario();

    this.seleccionado = null;

    this.editando = false;
    this.errorFormulario = '';

    this.vista = 'formulario';
  }

  // ======================================
  // EDITAR ALUMNO
  // ======================================

  editar(): void {

    const alumno = this.seleccionado;

    if (!alumno) return;

    this.formulario = {

      numero_control: alumno.numero_control,
      nombre: alumno.nombre ?? '',
      seg_nombre: alumno.seg_nombre ?? '',
      apellidos: alumno.apellidos ?? '',

      semestre: Number(alumno.semestre) || 1,
      estado: alumno.estado,

      id_carrera: alumno.id_carrera == null
        ? null
        : Number(alumno.id_carrera),

      detalle: {

        curp: alumno.curp ?? '',

        fecha_nacimiento:
          this.fecha(alumno.fecha_nacimiento),

        telefono: alumno.telefono ?? '',
        email: alumno.email ?? '',

        calle: alumno.calle ?? '',

        numero_exterior:
          alumno.numero_exterior ?? '',

        numero_interior:
          alumno.numero_interior ?? '',

        colonia: alumno.colonia ?? '',

        codigo_postal:
          alumno.codigo_postal ?? '',

        municipio: alumno.municipio ?? '',

        estado: this.obtenerEstadoDomicilio(alumno),

        referencias: alumno.referencias ?? '',

        datos_contacto:
          alumno.datos_contacto ?? '',

        situacion_academica:
          alumno.situacion_academica ?? '',

        fecha_ingreso:
          this.fecha(alumno.fecha_ingreso),

      },
    };

    this.editando = true;
    this.errorFormulario = '';

    this.vista = 'formulario';
  }

  // ======================================
  // REGRESAR
  // ======================================

  regresar(): void {

    if (this.guardando || this.eliminando) {
      return;
    }

    this.errorFormulario = '';

    this.vista =
      this.vista === 'formulario' &&
      this.editando &&
      this.seleccionado
        ? 'detalle'
        : 'lista';
  }

  // ======================================
  // GUARDAR ALUMNO
  // POST: registrar.php / actualizar.php
  // ======================================

  guardar(): void {

    if (this.guardando) return;

    this.errorFormulario = '';

    const f = this.formulario;

    // Limpiar entradas
    f.numero_control = f.numero_control.trim();
    f.nombre = f.nombre.trim();
    f.seg_nombre = f.seg_nombre.trim();
    f.apellidos = f.apellidos.trim();

    f.detalle.email = f.detalle.email.trim();

    f.detalle.curp =
      f.detalle.curp.trim().toUpperCase();

    f.detalle.codigo_postal =
      f.detalle.codigo_postal.trim();

    // Validar campos obligatorios
    if (
      !f.numero_control ||
      !f.nombre ||
      !f.apellidos
    ) {

      this.errorFormulario =
        'Completa número de control, nombre y apellidos.';

      return;
    }

    // Validar semestre
    if (
      !Number.isInteger(Number(f.semestre)) ||
      f.semestre < 1 ||
      f.semestre > 20
    ) {

      this.errorFormulario =
        'El semestre debe estar entre 1 y 20.';

      return;
    }

    // Validar carrera
    if (
      !f.id_carrera ||
      !this.carreras.some(
        carrera =>
          Number(carrera.id_carrera) ===
          Number(f.id_carrera)
      )
    ) {

      this.errorFormulario =
        'Selecciona una carrera válida.';

      return;
    }

    // Validar correo
    if (
      f.detalle.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        f.detalle.email
      )
    ) {

      this.errorFormulario =
        'El correo electrónico no es válido.';

      return;
    }

    // Validar CURP
    if (
      f.detalle.curp &&
      !/^[A-Z0-9]{18}$/.test(f.detalle.curp)
    ) {

      this.errorFormulario =
        'La CURP debe contener 18 caracteres.';

      return;
    }

    // Validar código postal
    if (
      f.detalle.codigo_postal &&
      !/^\d{5}$/.test(f.detalle.codigo_postal)
    ) {

      this.errorFormulario =
        'El código postal debe tener 5 dígitos.';

      return;
    }

    // Normalizar datos opcionales
    const detalle = Object.fromEntries(
      Object.entries(f.detalle).map(
        ([clave, valor]) => [
          clave,
          valor.trim() || null,
        ]
      )
    ) as unknown as DetalleAlumno;

    /*
     * IMPORTANTE:
     * registrar.php recibe los campos
     * complementarios planos.
     *
     * actualizar.php recibe el objeto
     * 'detalle' anidado.
     */

    const payload = this.editando
      ? {
          numero_control: f.numero_control,
          nombre: f.nombre,
          seg_nombre: f.seg_nombre || null,
          apellidos: f.apellidos,
          semestre: Number(f.semestre),
          estado: f.estado,
          id_carrera: Number(f.id_carrera),
          detalle,
        }
      : {
          numero_control: f.numero_control,
          nombre: f.nombre,
          seg_nombre: f.seg_nombre || null,
          apellidos: f.apellidos,
          semestre: Number(f.semestre),
          id_carrera: Number(f.id_carrera),
          ...detalle,
        };

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    this.guardando = true;

    this.http.post<RespuestaApi<unknown>>(
      `${this.api}/alumnos/${accion}.php`,
      payload,
      {
        withCredentials: true,
      }
    )
    .pipe(
      finalize(() => {

        this.guardando = false;
        this.cdr.markForCheck();

      })
    )
    .subscribe({

      next: respuesta => {

        if (!respuesta.success) {

          this.errorFormulario =
            respuesta.message ||
            'No se pudo guardar el alumno.';

          return;
        }

        void this.mostrarToast(
          respuesta.message || 'Alumno guardado.'
        );

        this.vista = 'lista';
        this.seleccionado = null;

        this.cargarAlumnos();
      },

      error: error => {

        this.errorFormulario =
          this.mensajeError(error);

      },

    });
  }

  // ======================================
  // CONFIRMAR BAJA DEFINITIVA
  // ======================================

  async confirmarBaja(): Promise<void> {

    if (
      !this.seleccionado ||
      this.eliminando ||
      this.seleccionado.estado === 'Baja definitiva'
    ) {
      return;
    }

    const alerta = await this.alertas.create({

      header: 'Baja definitiva',

      message:
        `¿Dar de baja a ` +
        `${this.nombreCompleto(this.seleccionado)}? ` +
        `No se eliminará su expediente.`,

      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Dar de baja',
          role: 'destructive',
          handler: () => this.darDeBaja(),
        },
      ],

    });

    await alerta.present();
  }

  // ======================================
  // BAJA LÓGICA
  // POST: alumnos/eliminar.php
  // ======================================

  private darDeBaja(): void {

    if (!this.seleccionado) return;

    this.eliminando = true;

    this.http.post<RespuestaApi<unknown>>(
      `${this.api}/alumnos/eliminar.php`,
      {
        numero_control:
          this.seleccionado.numero_control,
      },
      {
        withCredentials: true,
      }
    )
    .pipe(
      finalize(() => {

        this.eliminando = false;
        this.cdr.markForCheck();

      })
    )
    .subscribe({

      next: respuesta => {

        if (!respuesta.success) {

          void this.mostrarToast(
            respuesta.message ||
            'No se pudo realizar la baja.',
            'danger'
          );

          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Alumno dado de baja.'
        );

        this.vista = 'lista';
        this.seleccionado = null;

        this.cargarAlumnos();
      },

      error: error => {

        void this.mostrarToast(
          this.mensajeError(error),
          'danger'
        );

      },

    });
  }

  // ======================================
  // FUNCIONES AUXILIARES
  // ======================================

  private obtenerEstadoDomicilio(
    alumno: Alumno
  ): string {

    /*
     * 'estado' del alumno corresponde a su
     * estado escolar.
     *
     * El estado del domicilio debe venir
     * con un alias diferente desde la API.
     */

    const datos = alumno as Alumno & {
      estado_domicilio?: string | null;
      estado_direccion?: string | null;
    };

    return (
      datos.estado_domicilio ??
      datos.estado_direccion ??
      ''
    );
  }

  private fecha(
    valor?: string | null
  ): string {

    return typeof valor === 'string'
      ? valor.slice(0, 10)
      : '';
  }

  private mensajeError(
    error: HttpErrorResponse
  ): string {

    if (error.status === 0) {

      return (
        'No hay conexión con el servidor. ' +
        'Revisa la API.'
      );
    }

    if (
      typeof error.error?.message === 'string'
    ) {

      return error.error.message;
    }

    return `Error del servidor (${error.status}).`;
  }

  private async mostrarToast(
    mensaje: string,
    color: string = 'success'
  ): Promise<void> {

    const toast = await this.toasts.create({
      message: mensaje,
      color,
      duration: 2400,
    });

    await toast.present();
  }

}
