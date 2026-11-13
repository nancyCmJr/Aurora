
import {
  Component,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  HttpClient,
  HttpErrorResponse
} from '@angular/common/http';

import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonNote,
  AlertController,
  ToastController
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  addOutline,
  arrowBackOutline,
  createOutline,
  refreshOutline,
  schoolOutline,
  businessOutline,
  peopleOutline,
  saveOutline,
  banOutline
} from 'ionicons/icons';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// ==========================================
// TIPOS
// ==========================================

type Vista = 'lista' | 'detalle' | 'formulario';

type TipoSalon =
  | 'Aula'
  | 'Laboratorio'
  | 'Taller'
  | 'Auditorio';

type EstadoSalon = 'Activo' | 'Inactivo';

type FiltroEstado = 'Todos' | EstadoSalon;

// ==========================================
// INTERFACES
// ==========================================

interface Salon {
  id_salon: number;
  nombre: string;
  tipo: TipoSalon;
  capacidad: number;
  id_edificio: number;
  id_area: number;
  estado: EstadoSalon;

  // Campos opcionales de JOIN
  nombre_edificio?: string | null;
  nombre_area?: string | null;

  // Información adicional opcional
  total_horarios?: number | null;
}

interface Edificio {
  id_edificio: number;
  nombre: string;
  estado: 'Activo' | 'Inactivo';
}

interface Area {
  id_area: number;
  nombre: string;
  id_edificio: number;
  estado: 'Activo' | 'Inactivo';
  nombre_edificio?: string | null;
}

interface FormSalon {
  id_salon?: number;
  nombre: string;
  tipo: TipoSalon;
  capacidad: number | null;
  id_edificio: number | null;
  id_area: number | null;
  estado: EstadoSalon;
}

interface RespuestaApi<T = unknown> {
  success: boolean;
  message?: string;
  total?: number;

  salones?: Salon[];
  salon?: Salon;

  edificios?: Edificio[];
  areas?: Area[];

  data?: T;
}

// ==========================================
// COMPONENTE
// ==========================================

@Component({
  selector: 'app-salones',
  standalone: true,
  templateUrl: './salones.page.html',
  styleUrls: ['./salones.page.scss'],

  imports: [
    CommonModule,
    FormsModule,

    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,

    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,

    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonNote
  ]
})
export class SalonesPage {

  // ======================================
  // API
  // ======================================

  private readonly api =
    environment.apiUrl.replace(/\/$/, '');

  // ======================================
  // VARIABLES GENERALES
  // ======================================

  vista: Vista = 'lista';

  salones: Salon[] = [];
  edificios: Edificio[] = [];
  areas: Area[] = [];

  seleccionado: Salon | null = null;

  busqueda = '';
  filtroEstado: FiltroEstado = 'Todos';
  filtroTipo = 'Todos';

  cargando = false;
  cargandoEdificios = false;
  cargandoAreas = false;
  cargandoDetalle = false;
  guardando = false;
  desactivando = false;

  editando = false;

  errorLista = '';
  errorEdificios = '';
  errorAreas = '';
  errorDetalle = '';

  form: FormSalon = this.formVacio();

  readonly tipos: TipoSalon[] = [
    'Aula',
    'Laboratorio',
    'Taller',
    'Auditorio'
  ];

  readonly estados: EstadoSalon[] = [
    'Activo',
    'Inactivo'
  ];

  // ======================================
  // CONSTRUCTOR
  // ======================================

  constructor(
    private http: HttpClient,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    addIcons({
      addOutline,
      arrowBackOutline,
      createOutline,
      refreshOutline,
      schoolOutline,
      businessOutline,
      peopleOutline,
      saveOutline,
      banOutline
    });
  }

  // ======================================
  // DETECCIÓN DE CAMBIOS
  // ======================================

  private actualizarVista(): void {
    this.cdr.markForCheck();
  }

  // ======================================
  // PERMISOS
  // ======================================

  get esAdmin(): boolean {
    return this.auth.obtenerUsuario()?.rol === 'Admin';
  }

  // ======================================
  // ENTRAR AL MÓDULO
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
    this.seleccionado = null;
    this.editando = false;

    void this.cargarDatos();
  }

  // ======================================
  // FORMULARIO INICIAL
  // ======================================

  private formVacio(): FormSalon {
    return {
      nombre: '',
      tipo: 'Aula',
      capacidad: null,
      id_edificio: null,
      id_area: null,
      estado: 'Activo'
    };
  }

  // ======================================
  // NORMALIZAR DATOS
  // ======================================

  private normalizarSalon(s: Salon): Salon {
    return {
      ...s,

      id_salon: Number(s.id_salon),
      nombre: String(s.nombre ?? ''),

      tipo: s.tipo,
      capacidad: Number(s.capacidad),

      id_edificio: Number(s.id_edificio),
      id_area: Number(s.id_area),

      estado: s.estado,

      total_horarios:
        s.total_horarios == null
          ? null
          : Number(s.total_horarios)
    };
  }

  private normalizarEdificio(
    e: Edificio
  ): Edificio {
    return {
      ...e,
      id_edificio: Number(e.id_edificio)
    };
  }

  private normalizarArea(a: Area): Area {
    return {
      ...a,
      id_area: Number(a.id_area),
      id_edificio: Number(a.id_edificio)
    };
  }

  // ======================================
  // CARGAR TODA LA INFORMACIÓN
  // ======================================

  async cargarDatos(): Promise<void> {

    await Promise.all([
      this.cargarSalones(),
      this.cargarEdificios(),
      this.cargarAreas()
    ]);

    this.actualizarVista();
  }

  // ======================================
  // LISTAR SALONES
  // ======================================

  async cargarSalones(): Promise<void> {

    this.cargando = true;
    this.errorLista = '';

    this.actualizarVista();

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/salones/listar.php`,
          { withCredentials: true }
        )
      );

      if (!res.success) {
        throw new Error(
          res.message ||
          'No se pudieron cargar los salones'
        );
      }

      const data = res.data as
        | { salones?: Salon[] }
        | Salon[]
        | undefined;

      const lista = res.salones ??
        (
          Array.isArray(data)
            ? data
            : data?.salones
        );

      if (!Array.isArray(lista)) {
        throw new Error(
          'El servidor no devolvió una lista válida de salones'
        );
      }

      this.salones = lista.map(
        salon => this.normalizarSalon(salon)
      );

      console.log(
        'Aurora - Salones cargados:',
        this.salones.length
      );

    } catch (error) {

      this.salones = [];

      this.errorLista = this.obtenerMensajeError(
        error,
        'Error al cargar los salones'
      );

      console.error(
        'Aurora Salones - listar:',
        error
      );

    } finally {

      this.cargando = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // LISTAR EDIFICIOS
  // ======================================

  async cargarEdificios(): Promise<void> {

    this.cargandoEdificios = true;
    this.errorEdificios = '';

    this.actualizarVista();

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/edificios/listar.php`,
          { withCredentials: true }
        )
      );

      if (!res.success) {
        throw new Error(
          res.message ||
          'No se pudieron cargar los edificios'
        );
      }

      const data = res.data as
        | { edificios?: Edificio[] }
        | Edificio[]
        | undefined;

      const lista = res.edificios ??
        (
          Array.isArray(data)
            ? data
            : data?.edificios
        );

      if (!Array.isArray(lista)) {
        throw new Error(
          'El servidor no devolvió una lista válida de edificios'
        );
      }

      this.edificios = lista.map(
        e => this.normalizarEdificio(e)
      );

    } catch (error) {

      this.edificios = [];

      this.errorEdificios = this.obtenerMensajeError(
        error,
        'Error al cargar edificios'
      );

      console.error(
        'Aurora Salones - edificios:',
        error
      );

    } finally {

      this.cargandoEdificios = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // LISTAR ÁREAS
  // ======================================

  async cargarAreas(): Promise<void> {

    this.cargandoAreas = true;
    this.errorAreas = '';

    this.actualizarVista();

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/areas/listar.php`,
          { withCredentials: true }
        )
      );

      if (!res.success) {
        throw new Error(
          res.message ||
          'No se pudieron cargar las áreas'
        );
      }

      const data = res.data as
        | { areas?: Area[] }
        | Area[]
        | undefined;

      const lista = res.areas ??
        (
          Array.isArray(data)
            ? data
            : data?.areas
        );

      if (!Array.isArray(lista)) {
        throw new Error(
          'El servidor no devolvió una lista válida de áreas'
        );
      }

      this.areas = lista.map(
        a => this.normalizarArea(a)
      );

    } catch (error) {

      this.areas = [];

      this.errorAreas = this.obtenerMensajeError(
        error,
        'Error al cargar las áreas'
      );

      console.error(
        'Aurora Salones - áreas:',
        error
      );

    } finally {

      this.cargandoAreas = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // FILTROS
  // ======================================

  get salonesFiltrados(): Salon[] {

    const texto = this.busqueda
      .toLowerCase()
      .trim();

    return this.salones.filter(salon => {

      const coincideEstado =
        this.filtroEstado === 'Todos' ||
        salon.estado === this.filtroEstado;

      const coincideTipo =
        this.filtroTipo === 'Todos' ||
        salon.tipo === this.filtroTipo;

      const contenido = [
        salon.id_salon,
        salon.nombre,
        salon.tipo,
        salon.capacidad,
        this.nombreEdificio(salon),
        this.nombreArea(salon),
        salon.estado
      ]
        .join(' ')
        .toLowerCase();

      return (
        coincideEstado &&
        coincideTipo &&
        contenido.includes(texto)
      );
    });
  }

  // ======================================
  // ESTADÍSTICAS
  // ======================================

  get totalSalones(): number {
    return this.salones.length;
  }

  get totalActivos(): number {
    return this.salones.filter(
      s => s.estado === 'Activo'
    ).length;
  }

  get totalInactivos(): number {
    return this.salones.filter(
      s => s.estado === 'Inactivo'
    ).length;
  }

  get capacidadTotal(): number {
    return this.salones
      .filter(s => s.estado === 'Activo')
      .reduce(
        (total, s) => total + s.capacidad,
        0
      );
  }

  // ======================================
  // EDIFICIO Y ÁREA DEL SALÓN
  // ======================================

  nombreEdificio(salon: Salon): string {

    const edificio = this.edificios.find(
      e => e.id_edificio === salon.id_edificio
    );

    return (
      edificio?.nombre ||
      salon.nombre_edificio ||
      `Edificio #${salon.id_edificio}`
    );
  }

  nombreArea(salon: Salon): string {

    const area = this.areas.find(
      a => a.id_area === salon.id_area
    );

    return (
      area?.nombre ||
      salon.nombre_area ||
      `Área #${salon.id_area}`
    );
  }

  // ======================================
  // EDIFICIO SELECCIONADO
  // ======================================

  get edificioSeleccionado(): Edificio | null {

    if (this.form.id_edificio == null) {
      return null;
    }

    return this.edificios.find(
      e => e.id_edificio ===
        Number(this.form.id_edificio)
    ) ?? null;
  }

  // ======================================
  // ÁREA SELECCIONADA
  // ======================================

  get areaSeleccionada(): Area | null {

    if (this.form.id_area == null) {
      return null;
    }

    return this.areas.find(
      a => a.id_area ===
        Number(this.form.id_area)
    ) ?? null;
  }

  // ======================================
  // EDIFICIOS DISPONIBLES
  // ======================================

  get edificiosDisponibles(): Edificio[] {

    const idActual = this.editando
      ? this.seleccionado?.id_edificio
      : null;

    return this.edificios.filter(e =>
      e.estado === 'Activo' ||
      e.id_edificio === idActual
    );
  }

  // ======================================
  // ÁREAS DEL EDIFICIO SELECCIONADO
  // ======================================

  get areasDisponibles(): Area[] {

    if (this.form.id_edificio == null) {
      return [];
    }

    const idEdificio =
      Number(this.form.id_edificio);

    const idActual = this.editando
      ? this.seleccionado?.id_area
      : null;

    return this.areas.filter(a =>

      a.id_edificio === idEdificio &&

      (
        a.estado === 'Activo' ||
        a.id_area === idActual
      )
    );
  }

  // ======================================
  // CAMBIO DE EDIFICIO
  // ======================================

  alCambiarEdificio(): void {

    const idEdificio =
      Number(this.form.id_edificio);

    const area = this.areas.find(
      a => a.id_area ===
        Number(this.form.id_area)
    );

    // Evitar que quede seleccionada
    // un área de otro edificio.

    if (
      !area ||
      area.id_edificio !== idEdificio
    ) {
      this.form.id_area = null;
    }

    this.actualizarVista();
  }

  // ======================================
  // COLORES
  // ======================================

  colorEstado(estado: EstadoSalon): string {
    return estado === 'Activo'
      ? 'success'
      : 'medium';
  }

  // ======================================
  // TRACK BY
  // ======================================

  trackById(
    _index: number,
    salon: Salon
  ): number {
    return salon.id_salon;
  }

  // ======================================
  // NAVEGACIÓN
  // ======================================

  volver(): void {

    if (
      this.guardando ||
      this.desactivando
    ) {
      return;
    }

    if (this.vista === 'formulario') {

      this.vista = this.editando
        ? 'detalle'
        : 'lista';

    } else if (this.vista === 'detalle') {

      this.vista = 'lista';

    } else {

      void this.router.navigateByUrl('/home');
    }

    this.actualizarVista();
  }

  // ======================================
  // NUEVO SALÓN
  // ======================================

  nuevoSalon(): void {

    if (!this.esAdmin) {
      return;
    }

    this.form = this.formVacio();
    this.seleccionado = null;

    this.editando = false;
    this.vista = 'formulario';

    if (
      this.edificios.length === 0 &&
      !this.cargandoEdificios
    ) {
      void this.cargarEdificios();
    }

    if (
      this.areas.length === 0 &&
      !this.cargandoAreas
    ) {
      void this.cargarAreas();
    }

    this.actualizarVista();
  }

  // ======================================
  // CONSULTAR DETALLE
  // ======================================

  async verDetalle(salon: Salon): Promise<void> {

    if (this.cargandoDetalle) {
      return;
    }

    this.seleccionado = salon;
    this.vista = 'detalle';
    this.cargandoDetalle = true;
    this.errorDetalle = '';

    this.actualizarVista();

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/salones/consultar.php`,
          {
            params: {
              id_salon: String(salon.id_salon)
            },
            withCredentials: true
          }
        )
      );

      if (!res.success) {
        throw new Error(
          res.message ||
          'No se pudo consultar el salón'
        );
      }

      const data = res.data as
        | { salon?: Salon }
        | Salon
        | undefined;

      const registro = res.salon ??
        (
          data && 'salon' in data
            ? data.salon
            : data
        );

      if (
        !registro ||
        !('id_salon' in registro)
      ) {
        throw new Error(
          'No se recibieron los datos del salón'
        );
      }

      this.seleccionado =
        this.normalizarSalon(registro);

    } catch (error) {

      this.errorDetalle = this.obtenerMensajeError(
        error,
        'Error al consultar el salón'
      );

      console.error(
        'Aurora Salones - consultar:',
        error
      );

    } finally {

      this.cargandoDetalle = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // EDITAR SALÓN
  // ======================================

  editarSalon(): void {

    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.cargandoDetalle
    ) {
      return;
    }

    const s = this.seleccionado;

    this.form = {
      id_salon: s.id_salon,
      nombre: s.nombre,
      tipo: s.tipo,
      capacidad: s.capacidad,
      id_edificio: s.id_edificio,
      id_area: s.id_area,
      estado: s.estado
    };

    this.editando = true;
    this.vista = 'formulario';

    this.actualizarVista();
  }

  // ======================================
  // VALIDAR FORMULARIO
  // ======================================

  private validarFormulario(): string | null {

    const f = this.form;

    const nombre = f.nombre.trim();
    const capacidad = Number(f.capacidad);

    const idEdificio =
      Number(f.id_edificio);

    const idArea =
      Number(f.id_area);

    // ====================================
    // NOMBRE
    // ====================================

    if (!nombre) {
      return 'Ingresa el nombre del salón';
    }

    if (nombre.length > 50) {
      return (
        'El nombre no puede superar ' +
        '50 caracteres'
      );
    }

    // ====================================
    // TIPO
    // ====================================

    if (!this.tipos.includes(f.tipo)) {
      return 'Selecciona un tipo de salón válido';
    }

    // ====================================
    // CAPACIDAD
    // ====================================

    if (
      f.capacidad == null ||
      !Number.isInteger(capacidad) ||
      capacidad <= 0
    ) {
      return (
        'La capacidad debe ser un número ' +
        'entero mayor que cero'
      );
    }

    // ====================================
    // EDIFICIO
    // ====================================

    if (
      f.id_edificio == null ||
      !Number.isInteger(idEdificio) ||
      idEdificio <= 0
    ) {
      return 'Selecciona un edificio';
    }

    const edificio = this.edificios.find(
      e => e.id_edificio === idEdificio
    );

    if (!edificio) {
      return 'El edificio seleccionado no existe';
    }

    // ====================================
    // ÁREA
    // ====================================

    if (
      f.id_area == null ||
      !Number.isInteger(idArea) ||
      idArea <= 0
    ) {
      return 'Selecciona un área';
    }

    const area = this.areas.find(
      a => a.id_area === idArea
    );

    if (!area) {
      return 'El área seleccionada no existe';
    }

    // ====================================
    // RELACIÓN ÁREA - EDIFICIO
    // ====================================

    if (area.id_edificio !== idEdificio) {
      return (
        'El área seleccionada no pertenece ' +
        'al edificio indicado'
      );
    }

    // ====================================
    // ESTADO
    // ====================================

    if (!this.estados.includes(f.estado)) {
      return 'Selecciona un estado válido';
    }

    // ====================================
    // ESTADOS DE EDIFICIO Y ÁREA
    // ====================================

    if (f.estado === 'Activo') {

      if (edificio.estado !== 'Activo') {
        return (
          'No puedes activar un salón ' +
          'en un edificio inactivo'
        );
      }

      if (area.estado !== 'Activo') {
        return (
          'No puedes activar un salón ' +
          'en un área inactiva'
        );
      }
    }

    // Al crear o cambiar de ubicación,
    // los destinos deben estar activos.

    const ubicacionCambiada =
      !this.editando ||
      this.seleccionado?.id_edificio !== idEdificio ||
      this.seleccionado?.id_area !== idArea;

    if (
      ubicacionCambiada &&
      (
        edificio.estado !== 'Activo' ||
        area.estado !== 'Activo'
      )
    ) {
      return (
        'Selecciona un edificio y un área activos'
      );
    }

    return null;
  }

  // ======================================
  // GUARDAR SALÓN
  // ======================================

  async guardarSalon(): Promise<void> {

    if (
      !this.esAdmin ||
      this.guardando
    ) {
      return;
    }

    if (
      this.cargandoEdificios ||
      this.cargandoAreas ||
      this.errorEdificios ||
      this.errorAreas
    ) {
      await this.mostrarToast(
        'Primero deben cargarse los edificios y áreas',
        'warning'
      );
      return;
    }

    const error = this.validarFormulario();

    if (error) {
      await this.mostrarToast(
        error,
        'warning'
      );
      return;
    }

    this.guardando = true;
    this.actualizarVista();

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    const payload = {

      ...(this.editando
        ? {
            id_salon: this.form.id_salon
          }
        : {}),

      nombre: this.form.nombre.trim(),
      tipo: this.form.tipo,

      capacidad: Number(
        this.form.capacidad
      ),

      id_edificio: Number(
        this.form.id_edificio
      ),

      id_area: Number(
        this.form.id_area
      ),

      estado: this.form.estado
    };

    try {

      const res = await firstValueFrom(

        this.http.post<RespuestaApi>(
          `${this.api}/salones/${accion}.php`,
          payload,
          { withCredentials: true }
        )
      );

      if (!res.success) {
        throw new Error(
          res.message ||
          'No se pudo guardar el salón'
        );
      }

      await this.mostrarToast(
        res.message ||
        'Salón guardado correctamente',
        'success'
      );

      this.vista = 'lista';
      this.seleccionado = null;
      this.editando = false;

      this.actualizarVista();

      // Actualizar listado automáticamente.
      await this.cargarSalones();

    } catch (error) {

      await this.mostrarError(
        error,
        'Error al guardar el salón'
      );

    } finally {

      this.guardando = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // CONFIRMAR BAJA
  // ======================================

  async confirmarBaja(): Promise<void> {

    if (
      !this.esAdmin ||
      !this.seleccionado ||
      this.seleccionado.estado !== 'Activo' ||
      this.desactivando
    ) {
      return;
    }

    const salon = this.seleccionado;

    const alerta = await this.alertCtrl.create({

      header: 'Desactivar salón',

      message:
        `¿Deseas desactivar el salón ` +
        `"${salon.nombre}"? ` +
        `Se conservará su historial. ` +
        `La API puede rechazar la operación ` +
        `si existen horarios activos relacionados.`,

      buttons: [
        {
          text: 'Volver',
          role: 'cancel'
        },
        {
          text: 'Desactivar',
          role: 'destructive',

          handler: () => {
            void this.darDeBaja(salon.id_salon);
          }
        }
      ]
    });

    await alerta.present();
  }

  // ======================================
  // BAJA LÓGICA
  // ======================================

  private async darDeBaja(
    idSalon: number
  ): Promise<void> {

    if (this.desactivando) {
      return;
    }

    this.desactivando = true;
    this.actualizarVista();

    try {

      // El endpoint debe cambiar
      // estado = 'Inactivo', sin borrar
      // físicamente el registro.

      const res = await firstValueFrom(

        this.http.post<RespuestaApi>(
          `${this.api}/salones/eliminar.php`,
          {
            id_salon: idSalon
          },
          {
            withCredentials: true
          }
        )
      );

      if (!res.success) {
        throw new Error(
          res.message ||
          'No se pudo desactivar el salón'
        );
      }

      await this.mostrarToast(
        res.message ||
        'Salón desactivado correctamente',
        'success'
      );

      this.vista = 'lista';
      this.seleccionado = null;

      this.actualizarVista();

      await this.cargarSalones();

    } catch (error) {

      await this.mostrarError(
        error,
        'Error al desactivar el salón'
      );

    } finally {

      this.desactivando = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // MENSAJES DE ERROR
  // ======================================

  private obtenerMensajeError(
    error: unknown,
    predeterminado: string
  ): string {

    if (error instanceof HttpErrorResponse) {

      if (
        typeof error.error?.message === 'string'
      ) {
        return error.error.message;
      }

      if (error.status === 0) {
        return (
          'No fue posible conectar con la API. ' +
          'Revisa Apache, la ruta PHP y CORS.'
        );
      }

      if (error.status === 200) {
        return (
          'PHP devolvió una respuesta no válida. ' +
          'Revisa Network → Response.'
        );
      }

      if (error.status === 401) {
        return 'Tu sesión ha expirado.';
      }

      if (error.status === 403) {
        return (
          'No tienes permisos para esta operación.'
        );
      }

      if (error.status === 404) {
        return (
          'No se encontró el endpoint o registro.'
        );
      }

      if (error.status === 409) {
        return (
          'La operación fue rechazada por ' +
          'una restricción de integridad.'
        );
      }

      return `Error del servidor (${error.status}).`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return predeterminado;
  }

  private async mostrarError(
    error: unknown,
    predeterminado: string
  ): Promise<void> {

    console.error(
      'Aurora Salones:',
      error
    );

    await this.mostrarToast(
      this.obtenerMensajeError(
        error,
        predeterminado
      ),
      'danger'
    );
  }

  // ======================================
  // TOAST
  // ======================================

  private async mostrarToast(
    mensaje: string,
    color: 'primary' | 'success' |
           'danger' | 'warning' = 'primary'
  ): Promise<void> {

    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 3000,
      color,
      position: 'bottom'
    });

    await toast.present();
  }
}
