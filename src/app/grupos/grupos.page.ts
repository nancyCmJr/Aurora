
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
import { finalize, forkJoin } from 'rxjs';

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
  peopleOutline,
  createOutline,
  saveOutline,
  banOutline,
  bookOutline,
  personOutline
} from 'ionicons/icons';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// ==========================================
// TIPOS
// ==========================================

type Vista = 'lista' | 'detalle' | 'formulario';

type EstadoGrupo =
  | 'Planeado'
  | 'Abierto'
  | 'Cerrado'
  | 'Cancelado';

type ModalidadGrupo = 'Entre semana' | 'Sabado';

type FiltroEstado = 'Todos' | EstadoGrupo;

// ==========================================
// INTERFACES
// ==========================================

interface Grupo {
  id_grupo: number;
  clave_grupo: string;

  capacidad: number;
  semestre: number;

  // NUEVOS CAMPOS
  periodo: string;
  anio: number;

  id_materia: number;
  id_docente: number;

  modalidad: ModalidadGrupo;
  estado: EstadoGrupo;

  // Información obtenida mediante JOIN

  clave_materia?: string | null;
  nombre_materia?: string | null;
  estado_materia?: string | null;
  creditos_materia?: number | null;

  codigo_docente?: string | null;
  nombre_docente?: string | null;
  segundo_nombre_docente?: string | null;
  apellidos_docente?: string | null;
  titulo_academico?: string | null;
  estado_docente?: string | null;

  // Datos adicionales del listado o consulta

  alumnos_cursando?: number | null;
  total_horarios?: number | null;
  lugares_disponibles?: number | null;
}

interface Materia {
  id_materia: number;
  clave_materia: string;
  nombre: string;
  creditos?: number;
  estado: string;
}

interface Docente {
  id_docente: number;
  codigo: string;
  nombre: string;
  seg_nombre?: string | null;
  apellidos: string;
  estado: string;
  titulo_academico?: string | null;
}

interface FormularioGrupo {
  clave_grupo: string;
  capacidad: number | null;
  semestre: number | null;

  // NUEVOS CAMPOS
  periodo: string;
  anio: number | null;

  id_materia: number | null;
  id_docente: number | null;

  modalidad: ModalidadGrupo;
  estado: EstadoGrupo;
}

interface RespuestaApi {
  success: boolean;
  message?: string;
  id_grupo?: number;
}

interface RespuestaGrupos extends RespuestaApi {
  grupos?: Grupo[];
  data?: Grupo[];
  total?: number;
}

interface RespuestaGrupo extends RespuestaApi {
  grupo?: Grupo;
  data?: Grupo;
}

interface RespuestaMaterias extends RespuestaApi {
  materias?: Materia[];
  data?: Materia[];
}

interface RespuestaDocentes extends RespuestaApi {
  docentes?: Docente[];
  data?: Docente[];
}

// ==========================================
// FORMULARIO VACÍO
// ==========================================

function formularioVacio(): FormularioGrupo {
  return {
    clave_grupo: '',
    capacidad: 40,
    semestre: 1,

    periodo: '',
    anio: new Date().getFullYear(),

    id_materia: null,
    id_docente: null,

    modalidad: 'Entre semana',
    estado: 'Planeado'
  };
}

// ==========================================
// COMPONENTE
// ==========================================

@Component({
  selector: 'app-grupos',
  standalone: true,
  templateUrl: './grupos.page.html',
  styleUrls: ['./grupos.page.scss'],
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
export class GruposPage {

  // ======================================
  // SERVICIOS
  // ======================================

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertas = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly api =
    environment.apiUrl.replace(/\/$/, '');

  // ======================================
  // VARIABLES GENERALES
  // ======================================

  vista: Vista = 'lista';

  busqueda = '';
  filtroEstado: FiltroEstado = 'Todos';

  grupos: Grupo[] = [];
  materias: Materia[] = [];
  docentes: Docente[] = [];

  seleccionado: Grupo | null = null;

  formulario: FormularioGrupo = formularioVacio();

  editando = false;

  cargando = false;
  cargandoDetalle = false;
  cargandoCatalogos = false;
  catalogosListos = false;

  guardando = false;
  cancelando = false;

  errorLista = '';
  errorDetalle = '';
  errorFormulario = '';
  errorCatalogos = '';

  readonly semestres = Array.from(
    { length: 20 },
    (_, i) => i + 1
  );

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      peopleOutline,
      createOutline,
      saveOutline,
      banOutline,
      bookOutline,
      personOutline
    });
  }

  // ======================================
  // PERMISOS
  // ======================================

  get esAdmin(): boolean {
    return this.auth.obtenerUsuario()?.rol === 'Admin';
  }

  // ======================================
  // ENTRADA A LA PÁGINA
  // ======================================

  ionViewWillEnter(): void {
    const usuario = this.auth.obtenerUsuario();

    if (!usuario) {
      void this.router.navigateByUrl('/login', {
        replaceUrl: true
      });
      return;
    }

    if (usuario.rol !== 'Admin') {
      void this.router.navigateByUrl('/home', {
        replaceUrl: true
      });
      return;
    }

    this.vista = 'lista';
    this.cargarGrupos();
  }

  // ======================================
  // NORMALIZAR DATOS DE MYSQL
  // ======================================

  private normalizarGrupo(grupo: Grupo): Grupo {
    return {
      ...grupo,

      id_grupo: Number(grupo.id_grupo),
      clave_grupo: String(grupo.clave_grupo ?? ''),

      capacidad: Number(grupo.capacidad),
      semestre: Number(grupo.semestre),

      // NUEVOS CAMPOS
      periodo: String(grupo.periodo ?? ''),
      anio: Number(grupo.anio ?? 0),

      id_materia: Number(grupo.id_materia),
      id_docente: Number(grupo.id_docente),

      alumnos_cursando:
        grupo.alumnos_cursando == null
          ? null
          : Number(grupo.alumnos_cursando),

      total_horarios:
        grupo.total_horarios == null
          ? null
          : Number(grupo.total_horarios),

      lugares_disponibles:
        grupo.lugares_disponibles == null
          ? null
          : Number(grupo.lugares_disponibles)
    };
  }

  // ======================================
  // FILTRAR GRUPOS
  // ======================================

  get gruposFiltrados(): Grupo[] {
    const texto = this.busqueda.trim().toLowerCase();

    return this.grupos.filter(grupo => {

      if (
        this.filtroEstado !== 'Todos' &&
        grupo.estado !== this.filtroEstado
      ) {
        return false;
      }

      if (!texto) {
        return true;
      }

      return [
        grupo.clave_grupo,
        grupo.nombre_materia,
        grupo.clave_materia,
        this.nombreDocente(grupo),
        grupo.modalidad,
        grupo.semestre,

        // NUEVOS CAMPOS
        grupo.periodo,
        grupo.anio

      ].some(valor =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      );
    });
  }

  // ======================================
  // MATERIAS DISPONIBLES
  // ======================================

  get materiasDisponibles(): Materia[] {
    const idActual = this.editando
      ? this.seleccionado?.id_materia
      : null;

    return this.materias.filter(materia =>
      materia.estado === 'Activa' ||
      materia.id_materia === idActual
    );
  }

  // ======================================
  // DOCENTES DISPONIBLES
  // ======================================

  get docentesDisponibles(): Docente[] {
    const idActual = this.editando
      ? this.seleccionado?.id_docente
      : null;

    return this.docentes.filter(docente =>
      docente.estado === 'Activo' ||
      docente.id_docente === idActual
    );
  }

  // ======================================
  // ESTADOS PERMITIDOS AL EDITAR
  // ======================================

  get estadosPermitidos(): EstadoGrupo[] {
    if (!this.editando) {
      return [
        'Planeado',
        'Abierto',
        'Cerrado'
      ];
    }

    if (!this.seleccionado) {
      return [];
    }

    if (this.grupoConDependencias) {
      return [this.seleccionado.estado];
    }

    switch (this.seleccionado.estado) {
      case 'Planeado':
        return ['Planeado', 'Abierto'];

      case 'Abierto':
        return ['Abierto', 'Cerrado'];

      case 'Cerrado':
        return ['Cerrado'];

      case 'Cancelado':
        return [];
    }
  }

  // ======================================
  // DEPENDENCIAS DEL GRUPO
  // ======================================

  get grupoConDependencias(): boolean {
    if (!this.seleccionado || !this.editando) {
      return false;
    }

    const horarios = Number(
      this.seleccionado.total_horarios ?? 0
    );

    const alumnos = Number(
      this.seleccionado.alumnos_cursando ?? 0
    );

    return horarios > 0 || alumnos > 0;
  }

  // ======================================
  // LUGARES DISPONIBLES
  // ======================================

  lugaresDisponibles(grupo: Grupo): number | null {
    if (grupo.lugares_disponibles != null) {
      return Number(grupo.lugares_disponibles);
    }

    if (grupo.alumnos_cursando != null) {
      return Math.max(
        0,
        grupo.capacidad -
        Number(grupo.alumnos_cursando)
      );
    }

    return null;
  }

  // ======================================
  // NOMBRE DE MATERIA
  // ======================================

  nombreMateria(grupo: Grupo): string {
    if (grupo.nombre_materia) {
      return grupo.nombre_materia;
    }

    const materia = this.materias.find(
      m => m.id_materia === grupo.id_materia
    );

    return materia?.nombre ??
      `Materia #${grupo.id_materia}`;
  }

  // ======================================
  // NOMBRE DEL DOCENTE
  // ======================================

  nombreDocente(grupo: Grupo): string {
    const partes = [
      grupo.nombre_docente,
      grupo.segundo_nombre_docente,
      grupo.apellidos_docente
    ].filter(Boolean);

    if (partes.length > 0) {
      return partes.join(' ');
    }

    const docente = this.docentes.find(
      d => d.id_docente === grupo.id_docente
    );

    return docente
      ? this.nombreDocenteCatalogo(docente)
      : `Docente #${grupo.id_docente}`;
  }

  nombreDocenteCatalogo(docente: Docente): string {
    return [
      docente.nombre,
      docente.seg_nombre,
      docente.apellidos
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ======================================
  // COLOR DE ESTADO
  // ======================================

  colorEstado(estado: EstadoGrupo): string {
    switch (estado) {
      case 'Planeado':
        return 'warning';

      case 'Abierto':
        return 'success';

      case 'Cerrado':
        return 'medium';

      case 'Cancelado':
        return 'danger';

      default:
        return 'medium';
    }
  }

  // ======================================
  // LISTAR GRUPOS
  // GET: grupos/listar.php
  // ======================================

  cargarGrupos(
    refresher?: HTMLIonRefresherElement
  ): void {
    this.errorLista = '';

    if (!refresher) {
      this.cargando = true;
    }

    this.http.get<RespuestaGrupos>(
      `${this.api}/grupos/listar.php`,
      {
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

        const lista =
          respuesta.grupos ?? respuesta.data;

        if (
          !respuesta.success ||
          !Array.isArray(lista)
        ) {
          this.grupos = [];

          this.errorLista =
            respuesta.message ||
            'No se pudieron cargar los grupos.';

          return;
        }

        this.grupos = lista.map(
          grupo => this.normalizarGrupo(grupo)
        );

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {
        this.grupos = [];
        this.errorLista = this.mensajeError(error);
      }
    });
  }

  // ======================================
  // ACTUALIZAR LISTADO
  // ======================================

  refrescar(evento: Event): void {
    this.cargarGrupos(
      evento.target as HTMLIonRefresherElement
    );
  }

  // ======================================
  // CONSULTAR GRUPO
  // GET: grupos/consultar.php
  // ======================================

  abrirDetalle(grupo: Grupo): void {
    if (this.cargandoDetalle) {
      return;
    }

    this.errorDetalle = '';
    this.cargandoDetalle = true;

    this.http.get<RespuestaGrupo>(
      `${this.api}/grupos/consultar.php`,
      {
        params: {
          id_grupo: String(grupo.id_grupo)
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

        const encontrado =
          respuesta.grupo ?? respuesta.data;

        if (
          !respuesta.success ||
          !encontrado
        ) {
          this.errorDetalle =
            respuesta.message ||
            'No se pudo consultar el grupo.';

          return;
        }

        this.seleccionado =
          this.normalizarGrupo(encontrado);

        this.vista = 'detalle';
        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {
        this.errorDetalle = this.mensajeError(error);
      }
    });
  }

  // ======================================
  // NUEVO GRUPO
  // ======================================

  nuevo(): void {
    if (!this.esAdmin) {
      return;
    }

    this.seleccionado = null;
    this.editando = false;

    this.formulario = formularioVacio();

    this.errorFormulario = '';
    this.errorCatalogos = '';

    this.vista = 'formulario';
    this.cargarCatalogos();
  }

  // ======================================
  // EDITAR GRUPO
  // ======================================

  editar(): void {
    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.seleccionado.estado === 'Cancelado' ||
      this.cargandoDetalle
    ) {
      return;
    }

    const grupo = this.seleccionado;

    this.formulario = {
      clave_grupo: grupo.clave_grupo,
      capacidad: grupo.capacidad,
      semestre: grupo.semestre,

      // NUEVOS CAMPOS
      periodo: grupo.periodo,
      anio: grupo.anio || null,

      id_materia: grupo.id_materia,
      id_docente: grupo.id_docente,

      modalidad: grupo.modalidad,
      estado: grupo.estado
    };

    this.editando = true;

    this.errorFormulario = '';
    this.errorCatalogos = '';

    this.vista = 'formulario';
    this.cargarCatalogos();
  }

  // ======================================
  // REGRESAR
  // ======================================

  regresar(): void {
    if (this.guardando || this.cancelando) {
      return;
    }

    this.errorFormulario = '';
    this.errorDetalle = '';

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
  // CARGAR MATERIAS Y DOCENTES
  // ======================================

  cargarCatalogos(): void {
    if (!this.esAdmin) {
      return;
    }

    this.cargandoCatalogos = true;
    this.catalogosListos = false;
    this.errorCatalogos = '';

    forkJoin({

      materias: this.http.get<RespuestaMaterias>(
        `${this.api}/materias/listar.php`,
        {
          withCredentials: true
        }
      ),

      docentes: this.http.get<RespuestaDocentes>(
        `${this.api}/docentes/listar.php`,
        {
          withCredentials: true
        }
      )

    })
    .pipe(
      finalize(() => {
        this.cargandoCatalogos = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: respuesta => {

        const listaMaterias =
          respuesta.materias.materias ??
          respuesta.materias.data;

        const listaDocentes =
          respuesta.docentes.docentes ??
          respuesta.docentes.data;

        if (
          !respuesta.materias.success ||
          !Array.isArray(listaMaterias)
        ) {
          this.errorCatalogos =
            respuesta.materias.message ||
            'No se pudieron cargar las materias.';

          return;
        }

        if (
          !respuesta.docentes.success ||
          !Array.isArray(listaDocentes)
        ) {
          this.errorCatalogos =
            respuesta.docentes.message ||
            'No se pudieron cargar los docentes.';

          return;
        }

        this.materias = listaMaterias.map(materia => ({
          ...materia,
          id_materia: Number(materia.id_materia)
        }));

        this.docentes = listaDocentes.map(docente => ({
          ...docente,
          id_docente: Number(docente.id_docente)
        }));

        this.catalogosListos = true;
        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {
        this.errorCatalogos =
          this.mensajeError(error);

        this.catalogosListos = false;
      }
    });
  }

  // ======================================
  // VALIDAR Y GUARDAR
  // ======================================

  guardar(): void {

    if (
      !this.esAdmin ||
      this.guardando ||
      this.cargandoCatalogos ||
      !this.catalogosListos
    ) {
      return;
    }

    this.errorFormulario = '';

    const f = this.formulario;

    const clave = String(f.clave_grupo ?? '')
      .trim()
      .toUpperCase();

    const capacidad = Number(f.capacidad);
    const semestre = Number(f.semestre);

    // NUEVOS CAMPOS
    const periodo = String(f.periodo ?? '').trim();
    const anio = Number(f.anio);

    const idMateria = Number(f.id_materia);
    const idDocente = Number(f.id_docente);

    // ====================================
    // VALIDAR CLAVE
    // ====================================

    if (!clave || clave.length > 20) {
      this.errorFormulario =
        'La clave es obligatoria y debe tener ' +
        'máximo 20 caracteres.';

      return;
    }

    // ====================================
    // VALIDAR CAPACIDAD
    // ====================================

    if (
      f.capacidad === null ||
      !Number.isInteger(capacidad) ||
      capacidad <= 0
    ) {
      this.errorFormulario =
        'La capacidad debe ser un entero mayor que cero.';

      return;
    }

    // ====================================
    // VALIDAR SEMESTRE
    // ====================================

    if (
      f.semestre === null ||
      !Number.isInteger(semestre) ||
      semestre < 1 ||
      semestre > 20
    ) {
      this.errorFormulario =
        'El semestre debe estar entre 1 y 20.';

      return;
    }

    // ====================================
    // VALIDAR PERIODO (NUEVO)
    // ====================================

    if (
      periodo === '' ||
      periodo.length > 20
    ) {
      this.errorFormulario =
        'El periodo es obligatorio y debe ' +
        'tener máximo 20 caracteres.';

      return;
    }

    // ====================================
    // VALIDAR AÑO (NUEVO)
    // ====================================

    if (
      f.anio === null ||
      !Number.isInteger(anio) ||
      anio < 1901 ||
      anio > 2155
    ) {
      this.errorFormulario =
        'El año debe ser un número válido ' +
        'entre 1901 y 2155.';

      return;
    }

    // ====================================
    // VALIDAR MATERIA
    // ====================================

    const materia = this.materiasDisponibles.find(
      m => m.id_materia === idMateria
    );

    if (!materia) {
      this.errorFormulario =
        'Selecciona una materia válida.';

      return;
    }

    // ====================================
    // VALIDAR DOCENTE
    // ====================================

    const docente = this.docentesDisponibles.find(
      d => d.id_docente === idDocente
    );

    if (!docente) {
      this.errorFormulario =
        'Selecciona un docente válido.';

      return;
    }

    // ====================================
    // VALIDAR MODALIDAD
    // ====================================

    if (
      f.modalidad !== 'Entre semana' &&
      f.modalidad !== 'Sabado'
    ) {
      this.errorFormulario =
        'Selecciona una modalidad válida.';

      return;
    }

    // ====================================
    // VALIDAR ESTADO
    // ====================================

    if (!this.estadosPermitidos.includes(f.estado)) {
      this.errorFormulario =
        'El cambio de estado no está permitido.';

      return;
    }

    // ====================================
    // VALIDACIONES EN EDICIÓN
    // ====================================

    if (this.editando) {

      if (!this.seleccionado) {
        this.errorFormulario =
          'No se encontró el grupo para editar.';

        return;
      }

      if (this.seleccionado.estado === 'Cancelado') {
        this.errorFormulario =
          'Un grupo cancelado no puede modificarse.';

        return;
      }

      const original = this.seleccionado;

      // Si tiene dependencias, solamente
      // puede cambiarse el docente.

      if (this.grupoConDependencias) {

        const cambioRestringido =
          clave !== original.clave_grupo ||
          capacidad !== original.capacidad ||
          semestre !== original.semestre ||

          // NUEVOS CAMPOS
          periodo !== original.periodo ||
          anio !== original.anio ||

          idMateria !== original.id_materia ||
          f.modalidad !== original.modalidad ||
          f.estado !== original.estado;

        if (cambioRestringido) {
          this.errorFormulario =
            'Este grupo tiene horarios o alumnos cursando. ' +
            'Solamente puede cambiarse el docente.';

          return;
        }
      }

      if (
        capacidad <
        Number(original.alumnos_cursando ?? 0)
      ) {
        this.errorFormulario =
          'La capacidad no puede ser menor ' +
          'que los alumnos cursando.';

        return;
      }
    }

    // ====================================
    // CREAR JSON
    // ====================================

    const cuerpo = {

      ...(this.editando
        ? {
            id_grupo:
              this.seleccionado!.id_grupo
          }
        : {}),

      clave_grupo: clave,
      capacidad,
      semestre,

      // NUEVOS CAMPOS
      periodo,
      anio,

      id_materia: idMateria,
      id_docente: idDocente,

      modalidad: f.modalidad,
      estado: f.estado
    };

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    this.guardando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/grupos/${accion}.php`,
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
            'No se pudo guardar el grupo.';

          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Grupo guardado correctamente.'
        );

        this.seleccionado = null;
        this.vista = 'lista';

        this.cargarGrupos();
      },

      error: (error: HttpErrorResponse) => {
        this.errorFormulario =
          this.mensajeError(error);
      }
    });
  }

  // ======================================
  // CONFIRMAR CANCELACIÓN
  // ======================================

  async confirmarCancelacion(): Promise<void> {

    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.seleccionado.estado === 'Cancelado' ||
      this.cancelando
    ) {
      return;
    }

    if (
      Number(
        this.seleccionado.alumnos_cursando ?? 0
      ) > 0
    ) {
      await this.mostrarToast(
        'No puedes cancelar un grupo con alumnos cursando.',
        'danger'
      );
      return;
    }

    const alerta = await this.alertas.create({
      header: 'Cancelar grupo',

      message:
        `¿Deseas cancelar el grupo ` +
        `${this.seleccionado.clave_grupo}? ` +
        `Se conservarán sus registros académicos.`,

      buttons: [
        {
          text: 'Volver',
          role: 'cancel'
        },
        {
          text: 'Cancelar grupo',
          role: 'destructive',
          handler: () => this.cancelarGrupo()
        }
      ]
    });

    await alerta.present();
  }

  // ======================================
  // CANCELACIÓN LÓGICA
  // ======================================

  private cancelarGrupo(): void {

    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.cancelando
    ) {
      return;
    }

    this.cancelando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/grupos/eliminar.php`,
      {
        id_grupo: this.seleccionado.id_grupo
      },
      {
        withCredentials: true
      }
    )
    .pipe(
      finalize(() => {
        this.cancelando = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: respuesta => {

        if (!respuesta.success) {
          void this.mostrarToast(
            respuesta.message ||
            'No se pudo cancelar el grupo.',
            'danger'
          );
          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Grupo cancelado correctamente.'
        );

        this.seleccionado = null;
        this.vista = 'lista';

        this.cargarGrupos();
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
  // MANEJO DE ERRORES
  // ======================================

  private mensajeError(
    error: HttpErrorResponse
  ): string {

    if (error.status === 0) {
      return (
        'No fue posible conectar con la API. ' +
        'Verifica el nombre del archivo PHP, ' +
        'el servidor y la configuración CORS.'
      );
    }

    if (error.status === 401) {
      return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    }

    if (error.status === 403) {
      return 'No tienes permisos para realizar esta operación.';
    }

    if (
      typeof error.error?.message === 'string'
    ) {
      return error.error.message;
    }

    if (error.status === 400) {
      return 'PHP rechazó los datos enviados.';
    }

    return `Error del servidor (${error.status}).`;
  }

  // ======================================
  // NOTIFICACIONES
  // ======================================

  private async mostrarToast(
    mensaje: string,
    color: 'success' | 'danger' = 'success'
  ): Promise<void> {

    const toast = await this.toasts.create({
      message: mensaje,
      duration: 2500,
      color
    });

    await toast.present();
  }
}
