
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
  calendarOutline,
  timeOutline,
  schoolOutline,
  locationOutline,
  createOutline,
  banOutline,
  saveOutline
} from 'ionicons/icons';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// ==========================================
// TIPOS
// ==========================================

type Vista = 'lista' | 'detalle' | 'formulario';

type DiaSemana =
  | 'Lunes'
  | 'Martes'
  | 'Miercoles'
  | 'Jueves'
  | 'Viernes'
  | 'Sabado';

type Modalidad =
  | 'Entre semana'
  | 'Sabado';

type EstadoHorario =
  | 'Activo'
  | 'Cancelado';

type FiltroEstado =
  | 'Todos'
  | EstadoHorario;

// ==========================================
// INTERFACES
// ==========================================

interface Horario {
  id_horario: number;
  id_grupo: number;
  id_salon: number;

  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;

  // Campo real de la tabla horarios
  estado?: EstadoHorario | null;

  // Datos opcionales de JOIN
  clave_grupo?: string | null;
  nombre_salon?: string | null;
  nombre_materia?: string | null;
  nombre_docente?: string | null;
  nombre_edificio?: string | null;

  periodo?: string | null;
  anio?: number | null;
}

interface Grupo {
  id_grupo: number;
  clave_grupo: string;
  capacidad: number;
  semestre: number;

  modalidad: Modalidad;
  estado: string;

  periodo?: string | null;
  anio?: number | null;

  id_docente?: number | null;
  nombre_materia?: string | null;
  nombre_docente?: string | null;
}

interface Salon {
  id_salon: number;
  nombre: string;
  capacidad: number;
  estado: string;

  tipo?: string | null;
  nombre_edificio?: string | null;
}

interface FormularioHorario {
  id_grupo: number | null;
  id_salon: number | null;

  dia_semana: DiaSemana | '';
  hora_inicio: string;
  hora_fin: string;

  estado: EstadoHorario;
}

interface RespuestaBase {
  success: boolean;
  message?: string;
  id_horario?: number;
}

interface RespuestaListado extends RespuestaBase {
  horarios?: Horario[];
  data?: Horario[];
}

interface RespuestaConsulta extends RespuestaBase {
  horario?: Horario;
  data?: Horario;
}

interface RespuestaGrupos extends RespuestaBase {
  grupos?: Grupo[];
  data?: Grupo[];
}

interface RespuestaSalones extends RespuestaBase {
  salones?: Salon[];
  data?: Salon[];
}

// ==========================================
// FORMULARIO POR DEFECTO
// ==========================================

function formularioVacio(): FormularioHorario {
  return {
    id_grupo: null,
    id_salon: null,
    dia_semana: '',
    hora_inicio: '',
    hora_fin: '',
    estado: 'Activo'
  };
}

// ==========================================
// COMPONENTE
// ==========================================

@Component({
  selector: 'app-horarios',
  standalone: true,
  templateUrl: './horarios.page.html',
  styleUrls: ['./horarios.page.scss'],
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
export class HorariosPage {

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
  // VARIABLES
  // ======================================

  vista: Vista = 'lista';

  horarios: Horario[] = [];
  grupos: Grupo[] = [];
  salones: Salon[] = [];

  seleccionado: Horario | null = null;

  formulario: FormularioHorario =
    formularioVacio();

  busqueda = '';
  filtroDia = 'Todos';
  filtroEstado: FiltroEstado = 'Todos';

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

  readonly dias: DiaSemana[] = [
    'Lunes',
    'Martes',
    'Miercoles',
    'Jueves',
    'Viernes',
    'Sabado'
  ];

  readonly estados: EstadoHorario[] = [
    'Activo',
    'Cancelado'
  ];

  // ======================================
  // ICONOS
  // ======================================

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      calendarOutline,
      timeOutline,
      schoolOutline,
      locationOutline,
      createOutline,
      banOutline,
      saveOutline
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

    if (!this.esAdmin) {
      void this.router.navigateByUrl('/home', {
        replaceUrl: true
      });
      return;
    }

    this.vista = 'lista';
    this.cargarHorarios();
    this.cargarCatalogos();
  }

  // ======================================
  // NORMALIZACIÓN
  // ======================================

  private normalizarHora(valor: unknown): string {
    const texto = String(valor ?? '').trim();

    const coincidencia = texto.match(
      /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/
    );

    if (!coincidencia) {
      return texto;
    }

    return (
      `${coincidencia[1]}:${coincidencia[2]}`
    );
  }

  private normalizarHorario(h: Horario): Horario {
    return {
      ...h,
      id_horario: Number(h.id_horario),
      id_grupo: Number(h.id_grupo),
      id_salon: Number(h.id_salon),

      hora_inicio: this.normalizarHora(
        h.hora_inicio
      ),

      hora_fin: this.normalizarHora(
        h.hora_fin
      ),

      estado:
        h.estado === 'Activo' ||
        h.estado === 'Cancelado'
          ? h.estado
          : null,

      anio:
        h.anio == null
          ? null
          : Number(h.anio)
    };
  }

  // ======================================
  // REGISTROS RELACIONADOS
  // ======================================

  obtenerGrupo(id: number): Grupo | undefined {
    return this.grupos.find(
      g => g.id_grupo === id
    );
  }

  obtenerSalon(id: number): Salon | undefined {
    return this.salones.find(
      s => s.id_salon === id
    );
  }

  get grupoSeleccionado(): Grupo | null {
    if (this.formulario.id_grupo == null) {
      return null;
    }

    return this.obtenerGrupo(
      Number(this.formulario.id_grupo)
    ) ?? null;
  }

  get salonSeleccionado(): Salon | null {
    if (this.formulario.id_salon == null) {
      return null;
    }

    return this.obtenerSalon(
      Number(this.formulario.id_salon)
    ) ?? null;
  }

  // ======================================
  // DATOS PARA MOSTRAR
  // ======================================

  nombreDia(dia: string): string {
    if (dia === 'Miercoles') {
      return 'Miércoles';
    }

    if (dia === 'Sabado') {
      return 'Sábado';
    }

    return dia;
  }

  nombreGrupo(h: Horario): string {
    return (
      h.clave_grupo ||
      this.obtenerGrupo(h.id_grupo)?.clave_grupo ||
      `Grupo #${h.id_grupo}`
    );
  }

  nombreSalon(h: Horario): string {
    return (
      h.nombre_salon ||
      this.obtenerSalon(h.id_salon)?.nombre ||
      `Salón #${h.id_salon}`
    );
  }

  nombreMateria(h: Horario): string {
    return (
      h.nombre_materia ||
      this.obtenerGrupo(h.id_grupo)?.nombre_materia ||
      'Materia no especificada'
    );
  }

  nombreDocente(h: Horario): string {
    return (
      h.nombre_docente ||
      this.obtenerGrupo(h.id_grupo)?.nombre_docente ||
      'Docente no especificado'
    );
  }

  colorEstado(
    estado: EstadoHorario | null | undefined
  ): string {
    switch (estado) {
      case 'Activo':
        return 'success';

      case 'Cancelado':
        return 'danger';

      default:
        return 'medium';
    }
  }

  // ======================================
  // CATÁLOGOS DISPONIBLES
  // ======================================

  get gruposDisponibles(): Grupo[] {
    const idActual = this.editando
      ? this.seleccionado?.id_grupo
      : null;

    return this.grupos.filter(g =>
      g.estado === 'Planeado' ||
      g.estado === 'Abierto' ||
      g.id_grupo === idActual
    );
  }

  get salonesDisponibles(): Salon[] {
    const idActual = this.editando
      ? this.seleccionado?.id_salon
      : null;

    return this.salones.filter(s =>
      s.estado === 'Activo' ||
      s.id_salon === idActual
    );
  }

  // ======================================
  // DÍAS DISPONIBLES
  // ======================================

  get diasDisponibles(): DiaSemana[] {
    const grupo = this.grupoSeleccionado;

    if (!grupo) {
      return this.dias;
    }

    if (grupo.modalidad === 'Sabado') {
      return ['Sabado'];
    }

    return [
      'Lunes',
      'Martes',
      'Miercoles',
      'Jueves',
      'Viernes'
    ];
  }

  alCambiarGrupo(): void {
    if (
      this.formulario.dia_semana &&
      !this.diasDisponibles.includes(
        this.formulario.dia_semana as DiaSemana
      )
    ) {
      this.formulario.dia_semana = '';
    }

    this.errorFormulario = '';
  }

  // ======================================
  // FILTROS
  // ======================================

  get horariosFiltrados(): Horario[] {
    const texto = this.busqueda
      .trim()
      .toLowerCase();

    return this.horarios
      .filter(h => {

        if (
          this.filtroDia !== 'Todos' &&
          h.dia_semana !== this.filtroDia
        ) {
          return false;
        }

        if (
          this.filtroEstado !== 'Todos' &&
          h.estado !== this.filtroEstado
        ) {
          return false;
        }

        if (!texto) {
          return true;
        }

        return [
          this.nombreGrupo(h),
          this.nombreSalon(h),
          this.nombreMateria(h),
          this.nombreDocente(h),
          this.nombreDia(h.dia_semana),
          h.hora_inicio,
          h.hora_fin,
          h.estado,
          h.periodo,
          h.anio
        ].some(valor =>
          String(valor ?? '')
            .toLowerCase()
            .includes(texto)
        );
      })
      .sort((a, b) => {
        const diaA = this.dias.indexOf(
          a.dia_semana
        );

        const diaB = this.dias.indexOf(
          b.dia_semana
        );

        if (diaA !== diaB) {
          return diaA - diaB;
        }

        return a.hora_inicio.localeCompare(
          b.hora_inicio
        );
      });
  }

  // ======================================
  // LISTAR HORARIOS
  // ======================================

  cargarHorarios(
    refresher?: HTMLIonRefresherElement
  ): void {
    this.errorLista = '';

    if (!refresher) {
      this.cargando = true;
    }

    this.http.get<RespuestaListado>(
      `${this.api}/horarios/listar.php`,
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
          respuesta.horarios ??
          respuesta.data;

        if (
          !respuesta.success ||
          !Array.isArray(lista)
        ) {
          this.horarios = [];
          this.errorLista =
            respuesta.message ||
            'No se pudieron cargar los horarios.';
          return;
        }

        this.horarios = lista.map(
          h => this.normalizarHorario(h)
        );

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {
        console.error(
          'Error al listar horarios:',
          error
        );

        this.horarios = [];
        this.errorLista =
          this.mensajeError(error);
      }
    });
  }

  // ======================================
  // REFRESCAR
  // ======================================

  refrescar(evento: Event): void {
    this.cargarHorarios(
      evento.target as HTMLIonRefresherElement
    );
  }

  // ======================================
  // CARGAR GRUPOS Y SALONES
  // ======================================

  cargarCatalogos(): void {
    if (!this.esAdmin) {
      return;
    }

    this.cargandoCatalogos = true;
    this.catalogosListos = false;
    this.errorCatalogos = '';

    forkJoin({
      grupos: this.http.get<RespuestaGrupos>(
        `${this.api}/grupos/listar.php`,
        {
          withCredentials: true
        }
      ),

      salones: this.http.get<RespuestaSalones>(
        `${this.api}/salones/listar.php`,
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
        const grupos =
          respuesta.grupos.grupos ??
          respuesta.grupos.data;

        const salones =
          respuesta.salones.salones ??
          respuesta.salones.data;

        if (
          !respuesta.grupos.success ||
          !Array.isArray(grupos)
        ) {
          this.errorCatalogos =
            respuesta.grupos.message ||
            'No se pudieron cargar los grupos.';
          return;
        }

        if (
          !respuesta.salones.success ||
          !Array.isArray(salones)
        ) {
          this.errorCatalogos =
            respuesta.salones.message ||
            'No se pudieron cargar los salones.';
          return;
        }

        this.grupos = grupos.map(g => ({
          ...g,
          id_grupo: Number(g.id_grupo),
          capacidad: Number(g.capacidad),
          semestre: Number(g.semestre),

          id_docente:
            g.id_docente == null
              ? null
              : Number(g.id_docente),

          anio:
            g.anio == null
              ? null
              : Number(g.anio)
        }));

        this.salones = salones.map(s => ({
          ...s,
          id_salon: Number(s.id_salon),
          capacidad: Number(s.capacidad)
        }));

        this.catalogosListos = true;
        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {
        console.error(
          'Error al cargar catálogos:',
          error
        );

        this.errorCatalogos =
          this.mensajeError(error);
      }
    });
  }

  // ======================================
  // CONSULTAR HORARIO
  // ======================================

  abrirDetalle(horario: Horario): void {
    if (this.cargandoDetalle) {
      return;
    }

    this.errorDetalle = '';
    this.cargandoDetalle = true;

    this.http.get<RespuestaConsulta>(
      `${this.api}/horarios/consultar.php`,
      {
        params: {
          id_horario: String(
            horario.id_horario
          )
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
        const registro =
          respuesta.horario ??
          respuesta.data;

        if (
          !respuesta.success ||
          !registro
        ) {
          this.errorDetalle =
            respuesta.message ||
            'No se pudo consultar el horario.';
          return;
        }

        this.seleccionado =
          this.normalizarHorario(registro);

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
  // NUEVO HORARIO
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

    if (!this.catalogosListos) {
      this.cargarCatalogos();
    }
  }

  // ======================================
  // EDITAR HORARIO
  // ======================================

  
editar(): void {

  if (
    !this.esAdmin ||
    !this.seleccionado ||
    this.seleccionado.estado !== 'Activo'
  ) {
    return;
  }

  const h = this.seleccionado;

  this.formulario = {
    id_grupo: h.id_grupo,
    id_salon: h.id_salon,
    dia_semana: h.dia_semana,
    hora_inicio: this.normalizarHora(h.hora_inicio),
    hora_fin: this.normalizarHora(h.hora_fin),

    // Estado inicial al editar
    estado: 'Activo'
  };

  this.editando = true;
  this.errorFormulario = '';

  this.vista = 'formulario';

  if (!this.catalogosListos) {
    this.cargarCatalogos();
  }
}


  // ======================================
  // REGRESAR
  // ======================================

  regresar(): void {
    if (
      this.guardando ||
      this.cancelando
    ) {
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
  // CONVERTIR HORAS A MINUTOS
  // ======================================

  private convertirMinutos(hora: string): number {
    const m = String(hora).match(
      /^([01]\d|2[0-3]):([0-5]\d)$/
    );

    if (!m) {
      return NaN;
    }

    return Number(m[1]) * 60 + Number(m[2]);
  }

  // ======================================
  // COMPARAR PERIODOS ESCOLARES
  // ======================================

  private mismoPeriodo(
    grupoA: Grupo | undefined,
    grupoB: Grupo | undefined
  ): boolean {

    if (!grupoA || !grupoB) {
      return true;
    }

    if (
      grupoA.periodo &&
      grupoB.periodo &&
      grupoA.anio != null &&
      grupoB.anio != null
    ) {
      return (
        grupoA.periodo === grupoB.periodo &&
        grupoA.anio === grupoB.anio
      );
    }

    // Si faltan datos, no asumir
    // que los ciclos son distintos.
    return true;
  }

  // ======================================
  // DETECTAR EMPALMES LOCALES
  // ======================================

  private encontrarEmpalme(
    idGrupo: number,
    idSalon: number,
    dia: DiaSemana,
    inicio: number,
    fin: number
  ): string | null {

    const grupoNuevo =
      this.obtenerGrupo(idGrupo);

    for (const horario of this.horarios) {

      // Los cancelados no ocupan horario.
      if (horario.estado === 'Cancelado') {
        continue;
      }

      if (
        this.editando &&
        horario.id_horario ===
          this.seleccionado?.id_horario
      ) {
        continue;
      }

      if (horario.dia_semana !== dia) {
        continue;
      }

      const grupoExistente =
        this.obtenerGrupo(horario.id_grupo);

      if (
        !this.mismoPeriodo(
          grupoNuevo,
          grupoExistente
        )
      ) {
        continue;
      }

      const inicioActual =
        this.convertirMinutos(
          horario.hora_inicio
        );

      const finActual =
        this.convertirMinutos(
          horario.hora_fin
        );

      if (
        !Number.isFinite(inicioActual) ||
        !Number.isFinite(finActual)
      ) {
        continue;
      }

      const existeCruce =
        inicio < finActual &&
        fin > inicioActual;

      if (!existeCruce) {
        continue;
      }

      if (horario.id_grupo === idGrupo) {
        return (
          'El grupo ya tiene una clase ' +
          'en ese día y horario.'
        );
      }

      if (horario.id_salon === idSalon) {
        return (
          'El salón ya está ocupado ' +
          'en ese día y horario.'
        );
      }

      const docenteNuevo =
        grupoNuevo?.id_docente;

      const docenteExistente =
        grupoExistente?.id_docente;

      if (
        docenteNuevo != null &&
        docenteExistente != null &&
        Number(docenteNuevo) ===
          Number(docenteExistente)
      ) {
        return (
          'El docente ya tiene una clase ' +
          'asignada en ese intervalo.'
        );
      }
    }

    return null;
  }

  // ======================================
  // GUARDAR HORARIO
  // ======================================

  guardar(): void {
    if (
      !this.esAdmin ||
      this.guardando
    ) {
      return;
    }

    this.errorFormulario = '';

    if (
      !this.catalogosListos ||
      this.cargandoCatalogos
    ) {
      this.errorFormulario =
        'Primero deben cargarse los grupos y salones.';
      return;
    }

    const f = this.formulario;

    const idGrupo = Number(f.id_grupo);
    const idSalon = Number(f.id_salon);

    const dia = f.dia_semana;

    const horaInicio =
      this.normalizarHora(
        f.hora_inicio
      );

    const horaFin =
      this.normalizarHora(
        f.hora_fin
      );

    // ====================================
    // VALIDAR GRUPO
    // ====================================

    if (
      f.id_grupo == null ||
      !Number.isInteger(idGrupo) ||
      idGrupo <= 0
    ) {
      this.errorFormulario =
        'Selecciona un grupo válido.';
      return;
    }

    const grupo = this.obtenerGrupo(idGrupo);

    if (!grupo) {
      this.errorFormulario =
        'El grupo seleccionado no existe.';
      return;
    }

    if (
      grupo.estado !== 'Planeado' &&
      grupo.estado !== 'Abierto'
    ) {
      this.errorFormulario =
        'No se pueden asignar horarios ' +
        'a grupos cerrados o cancelados.';
      return;
    }

    // ====================================
    // VALIDAR SALÓN
    // ====================================

    if (
      f.id_salon == null ||
      !Number.isInteger(idSalon) ||
      idSalon <= 0
    ) {
      this.errorFormulario =
        'Selecciona un salón válido.';
      return;
    }

    const salon = this.obtenerSalon(idSalon);

    if (!salon) {
      this.errorFormulario =
        'El salón seleccionado no existe.';
      return;
    }

    if (salon.estado !== 'Activo') {
      this.errorFormulario =
        'El salón seleccionado no está activo.';
      return;
    }

    // ====================================
    // VALIDAR DÍA
    // ====================================

    if (
      !dia ||
      !this.dias.includes(
        dia as DiaSemana
      )
    ) {
      this.errorFormulario =
        'Selecciona un día válido.';
      return;
    }

    if (
      !this.diasDisponibles.includes(
        dia as DiaSemana
      )
    ) {
      this.errorFormulario =
        'El día no corresponde ' +
        'a la modalidad del grupo.';
      return;
    }

    // ====================================
    // VALIDAR HORAS
    // ====================================

    const inicio =
      this.convertirMinutos(horaInicio);

    const fin =
      this.convertirMinutos(horaFin);

    if (
      !Number.isFinite(inicio) ||
      !Number.isFinite(fin)
    ) {
      this.errorFormulario =
        'Ingresa horas válidas en formato HH:mm.';
      return;
    }

    if (fin <= inicio) {
      this.errorFormulario =
        'La hora final debe ser posterior ' +
        'a la hora inicial.';
      return;
    }

    // ====================================
    // VALIDAR ESTADO
    // ====================================

    if (!this.estados.includes(f.estado)) {
      this.errorFormulario =
        'El estado seleccionado no es válido.';
      return;
    }

    if (
      !this.editando &&
      f.estado !== 'Activo'
    ) {
      this.errorFormulario =
        'Los horarios nuevos deben registrarse activos.';
      return;
    }

    if (
      this.editando &&
      this.seleccionado?.estado !== 'Activo'
    ) {
      this.errorFormulario =
        'Un horario cancelado no puede modificarse.';
      return;
    }

    // ====================================
    // VALIDAR CAPACIDAD
    // ====================================

    if (grupo.capacidad > salon.capacidad) {
      this.errorFormulario =
        `La capacidad del salón (${salon.capacidad}) ` +
        `es menor que la del grupo (${grupo.capacidad}).`;
      return;
    }

    // ====================================
    // VALIDAR EMPALMES
    // ====================================

    // Solo es necesario revisar ocupación
    // si el horario quedará activo.
    if (f.estado === 'Activo') {

      const conflicto = this.encontrarEmpalme(
        idGrupo,
        idSalon,
        dia as DiaSemana,
        inicio,
        fin
      );

      if (conflicto) {
        this.errorFormulario = conflicto;
        return;
      }
    }

    // ====================================
    // CONSTRUIR JSON
    // ====================================

    const cuerpo = {
      ...(this.editando
        ? {
            id_horario:
              this.seleccionado!.id_horario
          }
        : {}),

      id_grupo: idGrupo,
      id_salon: idSalon,

      dia_semana: dia,

      hora_inicio: horaInicio,
      hora_fin: horaFin,

      estado: f.estado
    };

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    const url =
      `${this.api}/horarios/${accion}.php`;

    console.log(
      'Aurora Horarios - solicitud:',
      url,
      cuerpo
    );

    this.guardando = true;

    this.http.post<RespuestaBase>(
      url,
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
            'No se pudo guardar el horario.';
          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Horario guardado correctamente.'
        );

        this.seleccionado = null;
        this.vista = 'lista';

        this.cargarHorarios();
      },

      error: (error: HttpErrorResponse) => {

        console.error(
          'Aurora Horarios - error:',
          {
            status: error.status,
            respuestaPHP: error.error,
            datos: cuerpo,
            url: error.url
          }
        );

        this.errorFormulario =
          this.mensajeError(error);

        this.cdr.markForCheck();
      }
    });
  }

  // ======================================
  // CONFIRMAR CANCELACIÓN
  // ======================================

  async confirmarCancelar(): Promise<void> {

    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.seleccionado.estado !== 'Activo' ||
      this.cancelando
    ) {
      return;
    }

    const h = this.seleccionado;

    const alerta = await this.alertas.create({
      header: 'Cancelar horario',

      message:
        `¿Deseas cancelar el horario del ` +
        `${this.nombreDia(h.dia_semana)} ` +
        `de ${h.hora_inicio} a ${h.hora_fin}? ` +
        `El registro debe conservarse ` +
        `en el historial.`,

      buttons: [
        {
          text: 'Volver',
          role: 'cancel'
        },
        {
          text: 'Cancelar horario',
          role: 'destructive',
          handler: () => this.cancelarHorario()
        }
      ]
    });

    await alerta.present();
  }

  // ======================================
  // CANCELACIÓN LÓGICA
  // ======================================

  private cancelarHorario(): void {

    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.seleccionado.estado !== 'Activo' ||
      this.cancelando
    ) {
      return;
    }

    const idHorario =
      this.seleccionado.id_horario;

    this.cancelando = true;

    // Este endpoint debe implementar
    // UPDATE horarios SET estado='Cancelado'
    // y NO DELETE físico.

    this.http.post<RespuestaBase>(
      `${this.api}/horarios/eliminar.php`,
      {
        id_horario: idHorario
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
            'No se pudo cancelar el horario.',
            'danger'
          );
          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Horario cancelado correctamente.'
        );

        this.seleccionado = null;
        this.vista = 'lista';

        this.cargarHorarios();
      },

      error: (error: HttpErrorResponse) => {
        console.error(
          'Error al cancelar horario:',
          error.error
        );

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
        'Verifica Apache, el endpoint y CORS.'
      );
    }

    let respuesta: unknown = error.error;

    if (typeof respuesta === 'string') {
      try {
        respuesta = JSON.parse(respuesta);
      } catch {
        // Respuesta que no es JSON.
      }
    }

    if (
      respuesta &&
      typeof respuesta === 'object' &&
      !Array.isArray(respuesta)
    ) {
      const mensaje = (
        respuesta as { message?: unknown }
      ).message;

      if (
        typeof mensaje === 'string' &&
        mensaje.trim()
      ) {
        return mensaje;
      }
    }

    if (error.status === 200) {
      return (
        'PHP devolvió una respuesta no válida. ' +
        'Revisa Network → Response.'
      );
    }

    if (error.status === 400) {
      return 'PHP rechazó los datos enviados.';
    }

    if (error.status === 401) {
      return 'Tu sesión ha expirado.';
    }

    if (error.status === 403) {
      return 'No tienes permisos para esta operación.';
    }

    if (error.status === 404) {
      return 'No se encontró el endpoint o registro.';
    }

    if (error.status === 409) {
      return (
        'Existe un conflicto de horario. ' +
        'Revisa la ocupación del grupo, salón o docente.'
      );
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
