
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
  bookOutline,
  calendarOutline,
  createOutline,
  saveOutline,
  banOutline,
  trashOutline,
} from 'ionicons/icons';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// ========================================
// TIPOS E INTERFACES
// ========================================

type EstadoReticula = 'Vigente' | 'No vigente';

type Vista =
  | 'lista'
  | 'detalle'
  | 'formulario'
  | 'asignacion';

type Filtro = 'Todas' | EstadoReticula;

interface Carrera {
  id_carrera: number;
  nombre: string;
  estado: 'Activa' | 'Inactiva';
  total_creditos: number;
}

interface Reticula {
  id_reticula: number;
  anio: number;
  id_carrera: number;
  estado: EstadoReticula;

  nombre_carrera?: string | null;
  carrera?: string | null;

  total_materias?: number | null;
  creditos_asignados?: number | null;
  creditos_disponibles?: number | null;
  total_creditos?: number | null;
  creditos_carrera?: number | null;
}

interface MateriaCatalogo {
  id_materia: number;
  clave_materia: string;
  nombre: string;
  creditos: number;
  estado: 'Activa' | 'Inactiva';
}

interface MateriaAsignada {
  id_materia: number;
  clave_materia: string;
  nombre: string;
  creditos: number;
  semestre: number;

  estado_materia?: string;

  id_materia_requisito?: number | null;
  nombre_requisito?: string | null;

  prerrequisito?: {
    id_materia: number;
    clave_materia: string;
    nombre: string;
    semestre?: number | null;
  } | null;

  validacion_academica?: string | boolean | null;
  mensaje_validacion?: string | null;
}

interface ResumenReticula {
  total_materias?: number;
  creditos_totales?: number;
  creditos_permitidos?: number;
  creditos_disponibles?: number;
  materias_con_error_academico?: number;
  cumple_validaciones_academicas?: boolean;
}

interface RespuestaApi {
  success: boolean;
  message?: string;
}

interface RespuestaReticulas extends RespuestaApi {
  reticulas?: Reticula[];
}

interface RespuestaReticula extends RespuestaApi {
  reticula?: Reticula;
}

interface RespuestaCarreras extends RespuestaApi {
  carreras?: Carrera[];
}

interface RespuestaMaterias extends RespuestaApi {
  materias?: MateriaCatalogo[];
  data?: MateriaCatalogo[];
}

interface RespuestaMateriasReticula extends RespuestaApi {
  materias?: MateriaAsignada[];
  reticula?: Reticula;
  resumen?: ResumenReticula;
}

interface FormularioReticula {
  anio: number | null;
  id_carrera: number | null;
  estado: EstadoReticula;
}

// ========================================
// FORMULARIO INICIAL
// ========================================

function formularioVacio(): FormularioReticula {
  return {
    anio: new Date().getFullYear(),
    id_carrera: null,
    estado: 'Vigente',
  };
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

@Component({
  selector: 'app-reticulas',
  standalone: true,
  templateUrl: './reticulas.page.html',
  styleUrls: ['./reticulas.page.scss'],

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
export class ReticulasPage {

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
  filtro: Filtro = 'Todas';
  busqueda = '';

  reticulas: Reticula[] = [];
  carreras: Carrera[] = [];
  catalogoMaterias: MateriaCatalogo[] = [];
  materiasAsignadas: MateriaAsignada[] = [];

  resumen: ResumenReticula | null = null;
  seleccionada: Reticula | null = null;

  formulario: FormularioReticula =
    formularioVacio();

  editando = false;
  cargando = false;
  cargandoDetalle = false;
  cargandoCarreras = false;
  cargandoCatalogo = false;
  guardando = false;
  asignando = false;
  quitando = false;
  desactivando = false;

  errorLista = '';
  errorDetalle = '';
  errorFormulario = '';
  errorAsignacion = '';
  errorCarreras = '';
  errorCatalogo = '';

  // ======================================
  // ASIGNACIÓN DE MATERIAS
  // ======================================

  materiaParaAsignar: number | null = null;
  semestreParaAsignar: number | null = 1;

  filtroSemestre: number | 'Todos' = 'Todos';

  readonly semestres =
    Array.from({ length: 20 }, (_, i) => i + 1);

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      bookOutline,
      calendarOutline,
      createOutline,
      saveOutline,
      banOutline,
      trashOutline,
    });
  }

  // ======================================
  // ENTRADA AL MÓDULO
  // ======================================

  ionViewWillEnter(): void {

    if (this.auth.obtenerUsuario()?.rol !== 'Admin') {

      void this.router.navigateByUrl('/home', {
        replaceUrl: true,
      });

      return;
    }

    this.vista = 'lista';

    this.cargarReticulas();
    this.cargarCarreras();
  }

  // ======================================
  // FILTRAR RETÍCULAS
  // ======================================

  get reticulasFiltradas(): Reticula[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.reticulas.filter(r => {

      if (
        this.filtro !== 'Todas' &&
        r.estado !== this.filtro
      ) {
        return false;
      }

      if (!texto) return true;

      return [
        r.anio,
        this.nombreCarrera(r),
        r.id_reticula,
      ].some(valor =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      );
    });
  }

  // ======================================
  // FILTRAR MATERIAS ASIGNADAS
  // ======================================

  get materiasVisibles(): MateriaAsignada[] {

    const filtradas = this.materiasAsignadas.filter(m =>
      this.filtroSemestre === 'Todos' ||
      m.semestre === this.filtroSemestre
    );

    return [...filtradas].sort(
      (a, b) =>
        a.semestre - b.semestre ||
        a.nombre.localeCompare(b.nombre)
    );
  }

  // ======================================
  // MATERIAS DISPONIBLES PARA ASIGNAR
  // ======================================

  get materiasDisponibles(): MateriaCatalogo[] {

    const asignadas = new Set(
      this.materiasAsignadas.map(m => m.id_materia)
    );

    return this.catalogoMaterias.filter(m =>
      m.estado === 'Activa' &&
      !asignadas.has(m.id_materia)
    );
  }

  // ======================================
  // RESUMEN DE CRÉDITOS
  // ======================================

  get totalMaterias(): number {

    return this.resumen?.total_materias ??
      this.materiasAsignadas.length;
  }

  get creditosAsignados(): number {

    if (this.resumen?.creditos_totales != null) {
      return Number(this.resumen.creditos_totales);
    }

    return this.materiasAsignadas.reduce(
      (total, materia) =>
        total + materia.creditos,
      0
    );
  }

  get limiteCreditos(): number | null {

    const limite =
      this.resumen?.creditos_permitidos ??
      this.seleccionada?.total_creditos ??
      this.seleccionada?.creditos_carrera ??
      this.carreras.find(
        c => c.id_carrera === this.seleccionada?.id_carrera
      )?.total_creditos;

    return limite == null
      ? null
      : Number(limite);
  }

  nombreCarrera(reticula: Reticula): string {

    return (
      reticula.nombre_carrera ??
      reticula.carrera ??
      this.carreras.find(
        c => c.id_carrera === reticula.id_carrera
      )?.nombre ??
      'Carrera no disponible'
    );
  }

  // ======================================
  // LISTAR RETÍCULAS
  // GET: reticulas/listar.php
  // ======================================

  cargarReticulas(
    refresher?: HTMLIonRefresherElement
  ): void {

    this.errorLista = '';

    if (!refresher) {
      this.cargando = true;
    }

    this.http.get<RespuestaReticulas>(
      `${this.api}/reticulas/listar.php`,
      { withCredentials: true }
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
          !Array.isArray(respuesta.reticulas)
        ) {

          this.errorLista =
            respuesta.message ||
            'No se pudieron cargar las retículas.';

          this.reticulas = [];

          return;
        }

        this.reticulas = respuesta.reticulas.map(r => ({
          ...r,
          id_reticula: Number(r.id_reticula),
          id_carrera: Number(r.id_carrera),
          anio: Number(r.anio),
        }));
      },

      error: (error: HttpErrorResponse) => {

        this.reticulas = [];
        this.errorLista = this.mensajeError(error);
      },
    });
  }

  refrescar(evento: Event): void {

    this.cargarReticulas(
      evento.target as HTMLIonRefresherElement
    );
  }

  // ======================================
  // LISTAR CARRERAS
  // GET: carreras/listar.php
  // ======================================

  cargarCarreras(): void {

    this.cargandoCarreras = true;
    this.errorCarreras = '';

    this.http.get<RespuestaCarreras>(
      `${this.api}/carreras/listar.php`,
      { withCredentials: true }
    )
    .pipe(
      finalize(() => {
        this.cargandoCarreras = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({

      next: respuesta => {

        if (
          !respuesta.success ||
          !Array.isArray(respuesta.carreras)
        ) {

          this.errorCarreras =
            respuesta.message ||
            'No se pudieron cargar las carreras.';

          return;
        }

        this.carreras = respuesta.carreras.map(c => ({
          ...c,
          id_carrera: Number(c.id_carrera),
          total_creditos: Number(c.total_creditos),
        }));
      },

      error: (error: HttpErrorResponse) => {
        this.errorCarreras = this.mensajeError(error);
      },
    });
  }

  // ======================================
  // ABRIR RETÍCULA
  // ======================================

  abrirDetalle(reticula: Reticula): void {

    if (this.cargandoDetalle) return;

    this.seleccionada = reticula;
    this.filtroSemestre = 'Todos';

    this.vista = 'detalle';

    this.cargarDetalle();
  }

  // ======================================
  // CONSULTAR RETÍCULA Y SUS MATERIAS
  // ======================================

  cargarDetalle(): void {

    if (!this.seleccionada) return;

    const id = this.seleccionada.id_reticula;

    this.cargandoDetalle = true;
    this.errorDetalle = '';

    // Consultar datos generales

    this.http.get<RespuestaReticula>(
      `${this.api}/reticulas/consultar.php`,
      {
        params: {
          id_reticula: String(id),
        },
        withCredentials: true,
      }
    )
    .subscribe({

      next: respuesta => {

        if (respuesta.success && respuesta.reticula) {

          this.seleccionada = {
            ...this.seleccionada!,
            ...respuesta.reticula,

            id_reticula:
              Number(respuesta.reticula.id_reticula),

            id_carrera:
              Number(respuesta.reticula.id_carrera),

            anio:
              Number(respuesta.reticula.anio),
          };

        } else {

          this.errorDetalle =
            respuesta.message ||
            'No se pudo consultar la retícula.';
        }

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {

        this.errorDetalle = this.mensajeError(error);

        this.cdr.markForCheck();
      },
    });

    // Consultar materias relacionadas

    this.http.get<RespuestaMateriasReticula>(
      `${this.api}/reticulas/listar_materias.php`,
      {
        params: {
          id_reticula: String(id),
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

        if (
          !respuesta.success ||
          !Array.isArray(respuesta.materias)
        ) {

          this.errorDetalle =
            respuesta.message ||
            'No se pudieron cargar las materias de la retícula.';

          this.materiasAsignadas = [];
          this.resumen = null;

          return;
        }

        this.materiasAsignadas = respuesta.materias.map(m => ({
          ...m,
          id_materia: Number(m.id_materia),
          creditos: Number(m.creditos),
          semestre: Number(m.semestre),
        }));

        this.resumen = respuesta.resumen ?? null;
      },

      error: (error: HttpErrorResponse) => {

        this.errorDetalle = this.mensajeError(error);

        this.materiasAsignadas = [];
        this.resumen = null;
      },
    });
  }

  // ======================================
  // NUEVA RETÍCULA
  // ======================================

  nueva(): void {

    this.editando = false;
    this.seleccionada = null;

    this.materiasAsignadas = [];

    this.formulario = formularioVacio();
    this.errorFormulario = '';

    this.vista = 'formulario';
  }

  // ======================================
  // EDITAR RETÍCULA
  // ======================================

  editar(): void {

    if (!this.seleccionada) return;

    this.editando = true;
    this.errorFormulario = '';

    this.formulario = {
      anio: Number(this.seleccionada.anio),
      id_carrera: Number(this.seleccionada.id_carrera),
      estado: this.seleccionada.estado,
    };

    this.vista = 'formulario';
  }

  // ======================================
  // REGRESAR
  // ======================================

  regresar(): void {

    if (
      this.guardando ||
      this.asignando ||
      this.quitando ||
      this.desactivando
    ) {
      return;
    }

    this.errorFormulario = '';
    this.errorAsignacion = '';

    if (this.vista === 'asignacion') {

      this.vista = 'detalle';

    } else if (
      this.vista === 'formulario' &&
      this.editando &&
      this.seleccionada
    ) {

      this.vista = 'detalle';

    } else {

      this.vista = 'lista';
    }
  }

  // ======================================
  // GUARDAR RETÍCULA
  // POST: registrar.php / actualizar.php
  // ======================================

  guardar(): void {

    if (this.guardando) return;

    this.errorFormulario = '';

    const anio = Number(this.formulario.anio);
    const idCarrera = Number(this.formulario.id_carrera);
    const estado = this.formulario.estado;

    // Validar año

    if (
      !this.formulario.anio ||
      !Number.isInteger(anio) ||
      anio < 1901 ||
      anio > 2155
    ) {

      this.errorFormulario =
        'Introduce un año válido entre 1901 y 2155.';

      return;
    }

    // Validar carrera

    const carrera = this.carreras.find(
      c => c.id_carrera === idCarrera
    );

    if (!carrera) {

      this.errorFormulario =
        'Selecciona una carrera válida.';

      return;
    }

    if (
      carrera.estado === 'Inactiva' &&
      (
        !this.editando ||
        idCarrera !== this.seleccionada?.id_carrera
      )
    ) {

      this.errorFormulario =
        'No puedes asignar una carrera inactiva.';

      return;
    }

    // Validar estado

    if (
      estado !== 'Vigente' &&
      estado !== 'No vigente'
    ) {

      this.errorFormulario =
        'Selecciona un estado válido.';

      return;
    }

    if (this.editando && !this.seleccionada) {
      return;
    }

    // No cambiar carrera con materias asignadas

    if (
      this.editando &&
      this.materiasAsignadas.length > 0 &&
      idCarrera !== this.seleccionada?.id_carrera
    ) {

      this.errorFormulario =
        'No puedes cambiar la carrera si la retícula tiene materias asignadas.';

      return;
    }

    // Preparar datos para PHP

    const cuerpo = {
      ...(this.editando
        ? {
            id_reticula:
              this.seleccionada!.id_reticula,
          }
        : {}),

      anio,
      id_carrera: idCarrera,
      estado,
    };

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    this.guardando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/reticulas/${accion}.php`,
      cuerpo,
      { withCredentials: true }
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
            'No se pudo guardar la retícula.';

          return;
        }

        void this.mostrarToast(
          respuesta.message || 'Retícula guardada.'
        );

        this.seleccionada = null;
        this.vista = 'lista';

        this.cargarReticulas();
      },

      error: (error: HttpErrorResponse) => {

        this.errorFormulario =
          this.mensajeError(error);
      },
    });
  }

  // ======================================
  // ABRIR FORMULARIO DE ASIGNACIÓN
  // ======================================

  abrirAsignacion(): void {

    if (
      !this.seleccionada ||
      this.seleccionada.estado !== 'Vigente'
    ) {
      return;
    }

    this.materiaParaAsignar = null;
    this.semestreParaAsignar = 1;
    this.errorAsignacion = '';

    this.vista = 'asignacion';

    this.cargarCatalogo();
  }

  // ======================================
  // CARGAR CATÁLOGO DE MATERIAS
  // GET: materias/listar.php
  // ======================================

  cargarCatalogo(): void {

    this.cargandoCatalogo = true;
    this.errorCatalogo = '';

    this.http.get<RespuestaMaterias>(
      `${this.api}/materias/listar.php`,
      { withCredentials: true }
    )
    .pipe(
      finalize(() => {
        this.cargandoCatalogo = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({

      next: respuesta => {

        const materias =
          respuesta.materias ?? respuesta.data;

        if (
          !respuesta.success ||
          !Array.isArray(materias)
        ) {

          this.errorCatalogo =
            respuesta.message ||
            'No se pudo cargar el catálogo.';

          return;
        }

        this.catalogoMaterias = materias.map(m => ({
          ...m,
          id_materia: Number(m.id_materia),
          creditos: Number(m.creditos),
        }));
      },

      error: (error: HttpErrorResponse) => {

        this.errorCatalogo = this.mensajeError(error);
      },
    });
  }

  // ======================================
  // ASIGNAR MATERIA
  // POST: reticulas/asignar_materias.php
  // ======================================

  asignarMateria(): void {

    if (
      !this.seleccionada ||
      this.asignando ||
      this.seleccionada.estado !== 'Vigente'
    ) {
      return;
    }

    this.errorAsignacion = '';

    const idMateria = Number(this.materiaParaAsignar);
    const semestre = Number(this.semestreParaAsignar);

    const materia = this.materiasDisponibles.find(
      m => m.id_materia === idMateria
    );

    // Validar materia

    if (!materia) {

      this.errorAsignacion =
        'Selecciona una materia activa que aún no esté asignada.';

      return;
    }

    // Validar semestre

    if (
      !Number.isInteger(semestre) ||
      semestre < 1 ||
      semestre > 20
    ) {

      this.errorAsignacion =
        'Selecciona un semestre entre 1 y 20.';

      return;
    }

    // Comprobar límite de créditos conocido

    if (
      this.limiteCreditos !== null &&
      this.creditosAsignados + materia.creditos >
        this.limiteCreditos
    ) {

      this.errorAsignacion =
        'Esta materia excedería el límite de créditos de la carrera.';

      return;
    }

    this.asignando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/reticulas/asignar_materias.php`,
      {
        id_reticula: this.seleccionada.id_reticula,
        materias: [
          {
            id_materia: idMateria,
            semestre,
          },
        ],
      },
      { withCredentials: true }
    )
    .pipe(
      finalize(() => {
        this.asignando = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({

      next: respuesta => {

        if (!respuesta.success) {

          this.errorAsignacion =
            respuesta.message ||
            'No se pudo asignar la materia.';

          return;
        }

        void this.mostrarToast(
          respuesta.message || 'Materia asignada.'
        );

        this.materiaParaAsignar = null;
        this.vista = 'detalle';

        this.cargarDetalle();
      },

      error: (error: HttpErrorResponse) => {

        this.errorAsignacion =
          this.mensajeError(error);
      },
    });
  }

  // ======================================
  // CONFIRMAR RETIRO DE MATERIA
  // ======================================

  async confirmarQuitar(
    materia: MateriaAsignada
  ): Promise<void> {

    if (
      !this.seleccionada ||
      this.seleccionada.estado !== 'Vigente' ||
      this.quitando
    ) {
      return;
    }

    const alerta = await this.alertas.create({

      header: 'Quitar materia',

      message:
        `¿Quitar «${materia.nombre}» de esta retícula? ` +
        `La materia permanecerá en el catálogo.`,

      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Quitar',
          role: 'destructive',
          handler: () => this.quitarMateria(materia),
        },
      ],
    });

    await alerta.present();
  }

  // ======================================
  // QUITAR MATERIA
  // POST: reticulas/quitar_materia.php
  // ======================================

  private quitarMateria(
    materia: MateriaAsignada
  ): void {

    if (!this.seleccionada || this.quitando) {
      return;
    }

    this.quitando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/reticulas/quitar_materia.php`,
      {
        id_reticula: this.seleccionada.id_reticula,
        id_materia: materia.id_materia,
      },
      { withCredentials: true }
    )
    .pipe(
      finalize(() => {
        this.quitando = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({

      next: respuesta => {

        if (!respuesta.success) {

          void this.mostrarToast(
            respuesta.message ||
            'No se pudo quitar la materia.',
            'danger'
          );

          return;
        }

        void this.mostrarToast(
          respuesta.message || 'Materia retirada.'
        );

        this.cargarDetalle();
      },

      error: (error: HttpErrorResponse) => {

        void this.mostrarToast(
          this.mensajeError(error),
          'danger'
        );
      },
    });
  }

  // ======================================
  // CONFIRMAR DESACTIVACIÓN
  // ======================================

  async confirmarDesactivacion(): Promise<void> {

    if (
      !this.seleccionada ||
      this.desactivando ||
      this.seleccionada.estado === 'No vigente'
    ) {
      return;
    }

    const alerta = await this.alertas.create({

      header: 'Marcar como no vigente',

      message:
        `¿Deseas desactivar la retícula ` +
        `${this.seleccionada.anio} de ` +
        `${this.nombreCarrera(this.seleccionada)}? ` +
        `No se eliminarán sus materias.`,

      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Desactivar',
          role: 'destructive',
          handler: () => this.desactivar(),
        },
      ],
    });

    await alerta.present();
  }

  // ======================================
  // DESACTIVAR RETÍCULA
  // POST: reticulas/eliminar.php
  // ======================================

  private desactivar(): void {

    if (!this.seleccionada) return;

    this.desactivando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/reticulas/eliminar.php`,
      {
        id_reticula: this.seleccionada.id_reticula,
      },
      { withCredentials: true }
    )
    .pipe(
      finalize(() => {
        this.desactivando = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({

      next: respuesta => {

        if (!respuesta.success) {

          void this.mostrarToast(
            respuesta.message || 'No se pudo desactivar.',
            'danger'
          );

          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Retícula marcada como no vigente.'
        );

        this.vista = 'lista';
        this.seleccionada = null;

        this.cargarReticulas();
      },

      error: (error: HttpErrorResponse) => {

        void this.mostrarToast(
          this.mensajeError(error),
          'danger'
        );
      },
    });
  }

  // ======================================
  // ERRORES HTTP
  // ======================================

  private mensajeError(
    error: HttpErrorResponse
  ): string {

    if (error.status === 0) {

      return (
        'No se pudo conectar con la API. ' +
        'Revisa la ruta del archivo PHP y ' +
        'la configuración CORS/OPTIONS.'
      );
    }

    return typeof error.error?.message === 'string'
      ? error.error.message
      : `Error del servidor (${error.status}).`;
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
      duration: 2400,
      color,
    });

    await toast.present();
  }
}
