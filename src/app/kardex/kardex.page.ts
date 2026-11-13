
import {
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

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
  IonToolbar
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  addOutline,
  arrowBackOutline,
  bookOutline,
  createOutline,
  saveOutline,
  banOutline,
  documentTextOutline
} from 'ionicons/icons';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// ==========================================
// TIPOS
// ==========================================

type Vista = 'lista' | 'detalle' | 'formulario';

type EstadoKardex =
  | 'Cursando'
  | 'Aprobada'
  | 'Reprobada'
  | 'Baja';

type TipoCalificacion =
  | 'Ordinario'
  | 'Recuperacion'
  | 'No aprobatorio';

type TipoCurso =
  | 'Ordinario'
  | 'Repeticion'
  | 'Especial';

type FiltroEstado = 'Todos' | EstadoKardex;

// ==========================================
// INTERFAZ KARDEX
// ==========================================

interface Kardex {

  id_kardex: number;

  numero_control: string;
  id_grupo: number;

  periodo: string;
  anio: number;

  calificacion: number | null;

  tipo_calf: TipoCalificacion;
  curso: TipoCurso;

  estado: EstadoKardex;

  nombre_alumno?: string | null;
  alumno?: string | null;

  nombre?: string | null;
  seg_nombre?: string | null;
  apellidos?: string | null;

  clave_grupo?: string | null;

  clave_materia?: string | null;
  nombre_materia?: string | null;
  materia?: string | null;

  creditos?: number | null;
  docente?: string | null;
}

// ==========================================
// INTERFAZ ALUMNO
// ==========================================

interface AlumnoOpcion {

  numero_control: string;

  nombre: string;
  seg_nombre?: string | null;
  apellidos?: string | null;

  estado?: string;
}

// ==========================================
// INTERFAZ GRUPO
// ==========================================

interface GrupoOpcion {

  id_grupo: number;

  clave_grupo: string;

  nombre_materia?: string | null;
  materia?: string | null;

  semestre?: number;
  estado?: string;
}

// ==========================================
// FORMULARIO
// ==========================================

interface FormularioKardex {

  numero_control: string;
  id_grupo: number | null;

  periodo: string;
  anio: number | null;

  calificacion: number | null;

  tipo_calf: TipoCalificacion;
  curso: TipoCurso;

  estado: EstadoKardex;
}

// ==========================================
// RESPUESTAS DE LA API
// ==========================================

interface RespuestaBase {

  success: boolean;
  message?: string;
}

interface RespuestaListado<T> extends RespuestaBase {

  kardex?: T[] | T;

  alumnos?: T[];
  grupos?: T[];

  data?: T[] | T;

  registro?: T;

  total?: number;
}

// ==========================================
// FORMULARIO INICIAL
// ==========================================

function formularioVacio(): FormularioKardex {

  return {

    numero_control: '',
    id_grupo: null,

    periodo: '',
    anio: new Date().getFullYear(),

    calificacion: null,

    tipo_calf: 'Ordinario',
    curso: 'Ordinario',

    estado: 'Cursando'
  };
}

// ==========================================
// COMPONENTE
// ==========================================

@Component({

  selector: 'app-kardex',

  standalone: true,

  templateUrl: './kardex.page.html',

  styleUrls: ['./kardex.page.scss'],

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
    IonToolbar
  ]
})

export class KardexPage {

  // ======================================
  // SERVICIOS
  // ======================================

  private readonly http = inject(HttpClient);

  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  private readonly alertas = inject(AlertController);

  private readonly toasts = inject(ToastController);

  private readonly cdr = inject(ChangeDetectorRef);

  // ======================================
  // API
  // ======================================

  private readonly api =
    environment.apiUrl.replace(/\/$/, '');

  // ======================================
  // VARIABLES DE LA PÁGINA
  // ======================================

  vista: Vista = 'lista';

  busqueda = '';

  filtroEstado: FiltroEstado = 'Todos';

  filtroAnio: number | 'Todos' = 'Todos';

  registros: Kardex[] = [];

  seleccionado: Kardex | null = null;

  alumnos: AlumnoOpcion[] = [];

  grupos: GrupoOpcion[] = [];

  formulario: FormularioKardex = formularioVacio();

  editando = false;

  cargando = false;
  cargandoDetalle = false;
  cargandoCatalogos = false;

  guardando = false;
  dandoDeBaja = false;

  errorLista = '';
  errorDetalle = '';
  errorFormulario = '';
  errorCatalogos = '';

  // ======================================
  // CONSTRUCTOR
  // ======================================

  constructor() {

    addIcons({

      addOutline,
      arrowBackOutline,
      bookOutline,
      createOutline,
      saveOutline,
      banOutline,
      documentTextOutline
    });
  }

  // ======================================
  // PERMISOS
  // ======================================

  get esAdmin(): boolean {

    return (
      this.auth.obtenerUsuario()?.rol === 'Admin'
    );
  }

  get esAlumno(): boolean {

    return (
      this.auth.obtenerUsuario()?.rol === 'Alumno'
    );
  }

  // ======================================
  // OBTENER NÚMERO DE CONTROL DE SESIÓN
  // ======================================

  private obtenerNumeroControlSesion(): string {

    const usuario = this.auth.obtenerUsuario();

    if (!usuario) {

      return '';
    }

    // Se utiliza un tipo auxiliar porque
    // algunos modelos de Usuario no incluyen
    // numero_control en su interfaz.

    const datos = usuario as unknown as {

      numero_control?: unknown;

      alumno?: {
        numero_control?: unknown;
      } | null;
    };

    let numero = datos.numero_control;

    if (
      (numero === null || numero === undefined) &&
      datos.alumno
    ) {

      numero = datos.alumno.numero_control;
    }

    if (
      typeof numero === 'string' ||
      typeof numero === 'number'
    ) {

      return String(numero).trim();
    }

    return '';
  }

  // ======================================
  // FILTROS
  // ======================================

  get aniosDisponibles(): number[] {

    const anios = this.registros.map(
      registro => Number(registro.anio)
    );

    return [
      ...new Set(anios)
    ].sort((a, b) => b - a);
  }

  get registrosFiltrados(): Kardex[] {

    const texto = this.busqueda
      .trim()
      .toLowerCase();

    return this.registros.filter(registro => {

      // Filtro de estado

      if (
        this.filtroEstado !== 'Todos' &&
        registro.estado !== this.filtroEstado
      ) {

        return false;
      }

      // Filtro de año

      if (
        this.filtroAnio !== 'Todos' &&
        registro.anio !== this.filtroAnio
      ) {

        return false;
      }

      // Filtro de búsqueda

      if (!texto) {

        return true;
      }

      const valores = [

        registro.numero_control,

        this.nombreAlumno(registro),

        registro.clave_grupo,

        registro.clave_materia,

        this.nombreMateria(registro),

        registro.periodo
      ];

      return valores.some(valor =>

        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      );
    });
  }

  // ======================================
  // GRUPOS DISPONIBLES
  // ======================================

  get gruposDisponibles(): GrupoOpcion[] {

    return this.grupos.filter(grupo =>

      !grupo.estado ||
      grupo.estado === 'Abierto' ||
      grupo.estado === 'Activo'
    );
  }

  // ======================================
  // NOMBRE DEL ALUMNO
  // ======================================

  nombreAlumno(registro: Kardex): string {

    if (registro.alumno) {

      return registro.alumno;
    }

    if (registro.nombre_alumno) {

      return [

        registro.nombre_alumno,
        registro.seg_nombre,
        registro.apellidos

      ]
        .filter(Boolean)
        .join(' ');
    }

    const nombre = [

      registro.nombre,
      registro.seg_nombre,
      registro.apellidos

    ]
      .filter(Boolean)
      .join(' ');

    return nombre || registro.numero_control;
  }

  // ======================================
  // NOMBRE DE MATERIA
  // ======================================

  nombreMateria(registro: Kardex): string {

    return (
      registro.nombre_materia ??
      registro.materia ??
      'Materia no disponible'
    );
  }

  // ======================================
  // ETIQUETAS
  // ======================================

  etiquetaTipo(tipo: TipoCalificacion): string {

    if (tipo === 'Recuperacion') {

      return 'Recuperación';
    }

    return tipo;
  }

  etiquetaCurso(curso: TipoCurso): string {

    if (curso === 'Repeticion') {

      return 'Repetición';
    }

    return curso;
  }

  // ======================================
  // COLOR DEL ESTADO
  // ======================================

  colorEstado(estado: EstadoKardex): string {

    switch (estado) {

      case 'Aprobada':
        return 'success';

      case 'Reprobada':
        return 'danger';

      case 'Cursando':
        return 'primary';

      case 'Baja':
        return 'medium';

      default:
        return 'medium';
    }
  }

  // ======================================
  // ENTRAR A LA PÁGINA
  // ======================================

  ionViewWillEnter(): void {

    const usuario = this.auth.obtenerUsuario();

    if (!usuario) {

      void this.router.navigateByUrl('/login', {
        replaceUrl: true
      });

      return;
    }

    this.vista = 'lista';

    this.errorLista = '';

    // Validar la información del alumno

    if (
      usuario.rol === 'Alumno' &&
      !this.obtenerNumeroControlSesion()
    ) {

      this.registros = [];

      this.errorLista =
        'Tu cuenta no tiene un número de control ' +
        'disponible para consultar el historial.';

      return;
    }

    this.cargarKardex();
  }

  // ======================================
  // LISTAR KARDEX
  // ======================================

  cargarKardex(
    refresher?: HTMLIonRefresherElement
  ): void {

    const usuario = this.auth.obtenerUsuario();

    if (!usuario) {

      this.errorLista =
        'Debes iniciar sesión.';

      void refresher?.complete();

      return;
    }

    this.errorLista = '';

    if (!refresher) {

      this.cargando = true;
    }

    // ====================================
    // URL DEL ENDPOINT
    // ====================================

    const url = usuario.rol === 'Alumno'

      ? `${this.api}/kardex/consultar.php`

      : `${this.api}/kardex/listar.php`;

    // ====================================
    // PARÁMETROS CORREGIDOS
    // ====================================

    const params: Record<string, string> = {};

    if (usuario.rol === 'Alumno') {

      const numeroControl =
        this.obtenerNumeroControlSesion();

      if (!numeroControl) {

        this.registros = [];

        this.errorLista =
          'No se encontró el número de control ' +
          'en la sesión del alumno.';

        this.cargando = false;

        void refresher?.complete();

        return;
      }

      params['numero_control'] = numeroControl;
    }

    // ====================================
    // PETICIÓN HTTP CORREGIDA
    // ====================================

    this.http.get<RespuestaListado<Kardex>>(

      url,

      {
        params: params,
        withCredentials: true
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

        if (!respuesta.success) {

          this.registros = [];

          this.errorLista =
            respuesta.message ||
            'No se pudo consultar el kardex.';

          return;
        }

        // La API puede devolver un arreglo
        // o un registro individual.

        const contenido =
          respuesta.kardex ??
          respuesta.data ??
          respuesta.registro;

        let lista: Kardex[] = [];

        if (Array.isArray(contenido)) {

          lista = contenido;

        } else if (
          contenido &&
          typeof contenido === 'object'
        ) {

          lista = [contenido];

        } else {

          this.errorLista =
            respuesta.message ||
            'La API no devolvió un formato ' +
            'de kardex válido.';

          this.registros = [];

          return;
        }

        this.registros = lista.map(
          registro => this.normalizarRegistro(registro)
        );

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {

        if (
          usuario.rol === 'Alumno' &&
          error.status === 404
        ) {

          // Un alumno puede no tener registros.

          this.registros = [];

          return;
        }

        this.registros = [];

        this.errorLista = this.mensajeError(error);
      }
    });
  }

  // ======================================
  // REFRESCAR LISTADO
  // ======================================

  refrescar(evento: Event): void {

    const refresher =
      evento.target as HTMLIonRefresherElement;

    this.cargarKardex(refresher);
  }

  // ======================================
  // CONSULTAR REGISTRO INDIVIDUAL
  // ======================================

  abrirDetalle(registro: Kardex): void {

    if (this.cargandoDetalle) {

      return;
    }

    this.errorDetalle = '';

    this.cargandoDetalle = true;

    this.http.get<RespuestaListado<Kardex>>(

      `${this.api}/kardex/consultar.php`,

      {
        params: {
          id_kardex: String(registro.id_kardex)
        },

        withCredentials: true
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

        if (!respuesta.success) {

          this.errorDetalle =
            respuesta.message ||
            'No se pudo consultar el registro.';

          return;
        }

        const contenido =
          respuesta.kardex ??
          respuesta.data ??
          respuesta.registro;

        let encontrado: Kardex | undefined;

        if (Array.isArray(contenido)) {

          encontrado = contenido.find(
            item =>
              Number(item.id_kardex) ===
              Number(registro.id_kardex)
          );

        } else if (
          contenido &&
          typeof contenido === 'object'
        ) {

          encontrado = contenido;
        }

        if (!encontrado) {

          this.errorDetalle =
            'No se encontró el registro solicitado.';

          return;
        }

        this.seleccionado =
          this.normalizarRegistro(encontrado);

        this.vista = 'detalle';

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {

        this.errorDetalle =
          this.mensajeError(error);
      }
    });
  }

  // ======================================
  // NUEVO REGISTRO
  // ======================================

  nuevo(): void {

    if (!this.esAdmin) {

      return;
    }

    this.seleccionado = null;

    this.editando = false;

    this.errorFormulario = '';
    this.errorCatalogos = '';

    this.formulario = formularioVacio();

    this.vista = 'formulario';

    this.cargarCatalogos();
  }

  // ======================================
  // EDITAR REGISTRO
  // ======================================

  editar(): void {

    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.seleccionado.estado === 'Baja'
    ) {

      return;
    }

    const registro = this.seleccionado;

    this.formulario = {

      numero_control: registro.numero_control,

      id_grupo: registro.id_grupo,

      periodo: registro.periodo,

      anio: registro.anio,

      calificacion: registro.calificacion,

      tipo_calf: registro.tipo_calf,

      curso: registro.curso,

      estado: registro.estado
    };

    this.editando = true;

    this.errorFormulario = '';
    this.errorCatalogos = '';

    this.vista = 'formulario';
  }

  // ======================================
  // REGRESAR
  // ======================================

  regresar(): void {

    if (
      this.guardando ||
      this.dandoDeBaja
    ) {

      return;
    }

    this.errorDetalle = '';

    this.errorFormulario = '';

    if (
      this.vista === 'formulario' &&
      this.editando &&
      this.seleccionado
    ) {

      this.vista = 'detalle';

    } else {

      this.vista = 'lista';
    }
  }

  // ======================================
  // CARGAR CATÁLOGOS
  // ======================================

  cargarCatalogos(): void {

    if (!this.esAdmin) {

      return;
    }

    this.cargandoCatalogos = true;

    this.errorCatalogos = '';

    this.alumnos = [];
    this.grupos = [];

    let pendientes = 2;

    const finalizar = () => {

      pendientes--;

      if (pendientes <= 0) {

        this.cargandoCatalogos = false;
      }

      this.cdr.markForCheck();
    };

    // ====================================
    // LISTAR ALUMNOS
    // ====================================

    this.http.get<RespuestaListado<AlumnoOpcion>>(

      `${this.api}/alumnos/listar.php`,

      {
        withCredentials: true
      }

    )

    .pipe(
      finalize(finalizar)
    )

    .subscribe({

      next: respuesta => {

        const lista =
          respuesta.alumnos ??
          respuesta.data;

        if (
          !respuesta.success ||
          !Array.isArray(lista)
        ) {

          this.errorCatalogos =
            respuesta.message ||
            'No se pudo cargar la lista de alumnos.';

          return;
        }

        this.alumnos = lista

          .filter(alumno =>
            !alumno.estado ||
            alumno.estado === 'Activo'
          )

          .map(alumno => ({
            ...alumno,

            numero_control:
              String(alumno.numero_control)
          }));
      },

      error: (error: HttpErrorResponse) => {

        this.errorCatalogos =
          this.mensajeError(error);
      }
    });

    // ====================================
    // LISTAR GRUPOS
    // ====================================

    this.http.get<RespuestaListado<GrupoOpcion>>(

      `${this.api}/grupos/listar.php`,

      {
        withCredentials: true
      }

    )

    .pipe(
      finalize(finalizar)
    )

    .subscribe({

      next: respuesta => {

        const lista =
          respuesta.grupos ??
          respuesta.data;

        if (
          !respuesta.success ||
          !Array.isArray(lista)
        ) {

          this.errorCatalogos =
            respuesta.message ||
            'No se pudo cargar la lista de grupos.';

          return;
        }

        this.grupos = lista.map(grupo => ({

          ...grupo,

          id_grupo: Number(grupo.id_grupo)
        }));
      },

      error: (error: HttpErrorResponse) => {

        this.errorCatalogos =
          this.mensajeError(error);
      }
    });
  }

  // ======================================
  // CAMBIO DE ESTADO
  // ======================================

  cambiarEstado(): void {

    if (this.formulario.estado === 'Cursando') {

      this.formulario.calificacion = null;
    }
  }

  // ======================================
  // GUARDAR KARDEX
  // ======================================

  guardar(): void {

    if (
      !this.esAdmin ||
      this.guardando ||
      this.cargandoCatalogos
    ) {

      return;
    }

    this.errorFormulario = '';

    const formulario = this.formulario;

    const numeroControl =
      formulario.numero_control.trim();

    const periodo =
      formulario.periodo.trim();

    const idGrupo =
      Number(formulario.id_grupo);

    const anio =
      Number(formulario.anio);

    const calificacion =

      formulario.calificacion === null ||
      String(formulario.calificacion).trim() === ''

        ? null

        : Number(formulario.calificacion);

    // ====================================
    // VALIDAR NÚMERO DE CONTROL
    // ====================================

    if (
      numeroControl === '' ||
      numeroControl.length > 20
    ) {

      this.errorFormulario =
        'Selecciona un alumno válido.';

      return;
    }

    // ====================================
    // VALIDAR GRUPO
    // ====================================

    if (
      !Number.isInteger(idGrupo) ||
      idGrupo <= 0
    ) {

      this.errorFormulario =
        'Selecciona un grupo válido.';

      return;
    }

    // ====================================
    // VALIDAR PERIODO
    // ====================================

    if (
      periodo === '' ||
      periodo.length > 20
    ) {

      this.errorFormulario =
        'Ingresa un periodo válido.';

      return;
    }

    // ====================================
    // VALIDAR AÑO
    // ====================================

    if (
      formulario.anio === null ||
      !Number.isInteger(anio) ||
      anio < 1901 ||
      anio > 2155
    ) {

      this.errorFormulario =
        'El año debe estar entre 1901 y 2155.';

      return;
    }

    // ====================================
    // VALIDAR TIPO DE CALIFICACIÓN
    // ====================================

    const tiposCalificacion: TipoCalificacion[] = [

      'Ordinario',
      'Recuperacion',
      'No aprobatorio'
    ];

    if (
      !tiposCalificacion.includes(
        formulario.tipo_calf
      )
    ) {

      this.errorFormulario =
        'Selecciona un tipo de calificación válido.';

      return;
    }

    // ====================================
    // VALIDAR TIPO DE CURSO
    // ====================================

    const tiposCurso: TipoCurso[] = [

      'Ordinario',
      'Repeticion',
      'Especial'
    ];

    if (
      !tiposCurso.includes(
        formulario.curso
      )
    ) {

      this.errorFormulario =
        'Selecciona un tipo de curso válido.';

      return;
    }

    // ====================================
    // VALIDAR ESTADO
    // ====================================

    const estadosPermitidos: EstadoKardex[] = [

      'Cursando',
      'Aprobada',
      'Reprobada'
    ];

    if (
      !estadosPermitidos.includes(
        formulario.estado
      )
    ) {

      this.errorFormulario =
        'Selecciona un estado válido.';

      return;
    }

    // ====================================
    // MATERIA EN CURSO
    // ====================================

    if (
      formulario.estado === 'Cursando' &&
      calificacion !== null
    ) {

      this.errorFormulario =
        'Una materia en curso no debe tener calificación.';

      return;
    }

    // ====================================
    // CALIFICACIÓN FINAL OBLIGATORIA
    // ====================================

    if (
      formulario.estado !== 'Cursando' &&
      calificacion === null
    ) {

      this.errorFormulario =
        'Ingresa una calificación final.';

      return;
    }

    // ====================================
    // RANGO DE CALIFICACIÓN
    // ====================================

    if (
      calificacion !== null &&
      (
        !Number.isInteger(calificacion) ||
        calificacion < 0 ||
        calificacion > 100
      )
    ) {

      this.errorFormulario =
        'La calificación debe ser un número ' +
        'entero entre 0 y 100.';

      return;
    }

    // ====================================
    // VALIDAR ALUMNO Y GRUPO
    // ====================================

    if (!this.editando) {

      const alumnoExiste = this.alumnos.some(
        alumno =>
          alumno.numero_control === numeroControl
      );

      const grupoExiste =
        this.gruposDisponibles.some(
          grupo =>
            grupo.id_grupo === idGrupo
        );

      if (!alumnoExiste || !grupoExiste) {

        this.errorFormulario =
          'Debes seleccionar un alumno activo ' +
          'y un grupo disponible.';

        return;
      }
    }

    if (
      this.editando &&
      !this.seleccionado
    ) {

      this.errorFormulario =
        'No se encontró el registro que deseas editar.';

      return;
    }

    // ====================================
    // CONSTRUIR CUERPO JSON
    // ====================================

    const cuerpo = {

      ...(this.editando
        ? {
            id_kardex:
              this.seleccionado!.id_kardex
          }
        : {}),

      numero_control: numeroControl,

      id_grupo: idGrupo,

      periodo,

      anio,

      calificacion,

      tipo_calf: formulario.tipo_calf,

      curso: formulario.curso,

      estado: formulario.estado
    };

    // ====================================
    // ENDPOINT
    // ====================================

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    this.guardando = true;

    this.http.post<RespuestaBase>(

      `${this.api}/kardex/${accion}.php`,

      cuerpo,

      {
        withCredentials: true
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
            'No se pudo guardar el registro.';

          return;
        }

        void this.mostrarToast(

          respuesta.message ||
          'Registro guardado correctamente.'
        );

        this.seleccionado = null;

        this.vista = 'lista';

        this.cargarKardex();
      },

      error: (error: HttpErrorResponse) => {

        this.errorFormulario =
          this.mensajeError(error);
      }
    });
  }

  // ======================================
  // CONFIRMAR BAJA
  // ======================================

  async confirmarBaja(): Promise<void> {

    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.seleccionado.estado === 'Baja' ||
      this.dandoDeBaja
    ) {

      return;
    }

    const alerta = await this.alertas.create({

      header: 'Dar de baja del kardex',

      message:
        'El registro se conservará como parte ' +
        'del historial académico. ¿Deseas continuar?',

      buttons: [

        {
          text: 'Cancelar',
          role: 'cancel'
        },

        {
          text: 'Dar de baja',
          role: 'destructive',

          handler: () => {

            this.darDeBaja();
          }
        }
      ]
    });

    await alerta.present();
  }

  // ======================================
  // BAJA LÓGICA
  // ======================================

  private darDeBaja(): void {

    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.dandoDeBaja
    ) {

      return;
    }

    this.dandoDeBaja = true;

    this.http.post<RespuestaBase>(

      `${this.api}/kardex/eliminar.php`,

      {
        id_kardex:
          this.seleccionado.id_kardex
      },

      {
        withCredentials: true
      }

    )

    .pipe(

      finalize(() => {

        this.dandoDeBaja = false;

        this.cdr.markForCheck();
      })

    )

    .subscribe({

      next: respuesta => {

        if (!respuesta.success) {

          void this.mostrarToast(

            respuesta.message ||
            'No se pudo dar de baja el registro.',

            'danger'
          );

          return;
        }

        void this.mostrarToast(

          respuesta.message ||
          'Registro dado de baja correctamente.'
        );

        this.seleccionado = null;

        this.vista = 'lista';

        this.cargarKardex();
      },

      error: (error: HttpErrorResponse) => {

        void this.mostrarToast(

          this.mensajeError(error),

          'danger'
        );
      }
    });
  }

  // ======================================
  // NORMALIZAR DATOS DE MYSQL
  // ======================================

  private normalizarRegistro(
    registro: Kardex
  ): Kardex {

    return {

      ...registro,

      id_kardex:
        Number(registro.id_kardex),

      id_grupo:
        Number(registro.id_grupo),

      numero_control:
        String(registro.numero_control ?? ''),

      anio:
        Number(registro.anio),

      calificacion:

        registro.calificacion === null ||
        registro.calificacion === undefined ||
        String(registro.calificacion).trim() === ''

          ? null

          : Number(registro.calificacion)
    };
  }

  // ======================================
  // MANEJO DE ERRORES HTTP
  // ======================================

  private mensajeError(
    error: HttpErrorResponse
  ): string {

    if (error.status === 0) {

      return (
        'No fue posible conectar con la API. ' +
        'Verifica la ruta del endpoint PHP, ' +
        'la conexión y la configuración CORS.'
      );
    }

    if (error.status === 401) {

      return (
        'La sesión ha expirado. ' +
        'Inicia sesión nuevamente.'
      );
    }

    if (error.status === 403) {

      return (
        'No tienes permisos para realizar esta operación.'
      );
    }

    if (error.status === 404) {

      return (
        'No se encontró el endpoint o registro solicitado.'
      );
    }

    if (
      typeof error.error?.message === 'string'
    ) {

      return error.error.message;
    }

    return (
      `Error del servidor (${error.status}).`
    );
  }

  // ======================================
  // MOSTRAR TOAST
  // ======================================

  private async mostrarToast(

    mensaje: string,

    color: 'success' | 'danger' = 'success'

  ): Promise<void> {

    const toast = await this.toasts.create({

      message: mensaje,

      color: color,

      duration: 2400
    });

    await toast.present();
  }
}
