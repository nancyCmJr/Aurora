
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
  businessOutline,
  locationOutline,
  saveOutline,
  banOutline,
  searchOutline
} from 'ionicons/icons';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// ==========================================
// TIPOS
// ==========================================

type EstadoArea = 'Activo' | 'Inactivo';

type Vista = 'lista' | 'detalle' | 'formulario';

type FiltroEstado = 'Todos' | EstadoArea;

// ==========================================
// INTERFACES
// ==========================================

interface Area {
  id_area: number;
  nombre: string;
  id_edificio: number;
  estado: EstadoArea;

  // Información opcional mediante JOIN
  nombre_edificio?: string | null;

  // Contadores opcionales del backend
  total_salones?: number | null;
  total_contratos?: number | null;
}

interface Edificio {
  id_edificio: number;
  nombre: string;
  estado: 'Activo' | 'Inactivo';
}

interface FormArea {
  id_area?: number;
  nombre: string;
  id_edificio: number | null;
  estado: EstadoArea;
}

interface RespuestaApi<T = unknown> {
  success: boolean;
  message?: string;
  total?: number;

  areas?: Area[];
  area?: Area;

  edificios?: Edificio[];

  data?: T;
}

// ==========================================
// COMPONENTE
// ==========================================

@Component({
  selector: 'app-areas',
  standalone: true,
  templateUrl: './areas.page.html',
  styleUrls: ['./areas.page.scss'],

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
export class AreasPage {

  // ======================================
  // API
  // ======================================

  private readonly api =
    environment.apiUrl.replace(/\/$/, '');

  // ======================================
  // VARIABLES
  // ======================================

  vista: Vista = 'lista';

  areas: Area[] = [];
  edificios: Edificio[] = [];

  seleccionado: Area | null = null;

  busqueda = '';
  filtroEstado: FiltroEstado = 'Todos';

  cargando = false;
  cargandoEdificios = false;
  cargandoDetalle = false;
  guardando = false;
  desactivando = false;

  editando = false;

  errorLista = '';
  errorEdificios = '';
  errorDetalle = '';

  form: FormArea = this.formVacio();

  readonly estados: EstadoArea[] = [
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
      businessOutline,
      locationOutline,
      saveOutline,
      banOutline,
      searchOutline
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
  // CICLO DE VIDA
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
  // FORMULARIO VACÍO
  // ======================================

  private formVacio(): FormArea {
    return {
      nombre: '',
      id_edificio: null,
      estado: 'Activo'
    };
  }

  // ======================================
  // NORMALIZAR DATOS
  // ======================================

  private normalizarArea(area: Area): Area {
    return {
      ...area,
      id_area: Number(area.id_area),
      id_edificio: Number(area.id_edificio),
      nombre: String(area.nombre ?? ''),
      estado: area.estado,

      total_salones:
        area.total_salones == null
          ? null
          : Number(area.total_salones),

      total_contratos:
        area.total_contratos == null
          ? null
          : Number(area.total_contratos)
    };
  }

  private normalizarEdificio(
    edificio: Edificio
  ): Edificio {
    return {
      ...edificio,
      id_edificio: Number(edificio.id_edificio),
      nombre: String(edificio.nombre ?? '')
    };
  }

  // ======================================
  // CARGAR TODA LA INFORMACIÓN
  // ======================================

  async cargarDatos(): Promise<void> {

    await Promise.all([
      this.cargarAreas(),
      this.cargarEdificios()
    ]);

    this.actualizarVista();
  }

  // ======================================
  // CARGAR ÁREAS
  // ======================================

  async cargarAreas(): Promise<void> {

    this.cargando = true;
    this.errorLista = '';

    this.actualizarVista();

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/areas/listar.php`,
          {
            withCredentials: true
          }
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
        area => this.normalizarArea(area)
      );

      console.log(
        'Aurora - Áreas cargadas:',
        this.areas.length
      );

      this.actualizarVista();

    } catch (error) {

      this.areas = [];

      this.errorLista = this.obtenerMensajeError(
        error,
        'Error al cargar las áreas'
      );

      console.error(
        'Aurora Áreas - listar:',
        error
      );

    } finally {

      this.cargando = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // CARGAR EDIFICIOS
  // ======================================

  async cargarEdificios(): Promise<void> {

    this.cargandoEdificios = true;
    this.errorEdificios = '';

    this.actualizarVista();

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/edificios/listar.php`,
          {
            withCredentials: true
          }
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
        edificio => this.normalizarEdificio(edificio)
      );

      this.actualizarVista();

    } catch (error) {

      this.edificios = [];

      this.errorEdificios = this.obtenerMensajeError(
        error,
        'Error al cargar los edificios'
      );

      console.error(
        'Aurora Áreas - edificios:',
        error
      );

    } finally {

      this.cargandoEdificios = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // FILTROS
  // ======================================

  get areasFiltradas(): Area[] {

    const texto = this.busqueda
      .toLowerCase()
      .trim();

    return this.areas.filter(area => {

      const coincideEstado =
        this.filtroEstado === 'Todos' ||
        area.estado === this.filtroEstado;

      if (!coincideEstado) {
        return false;
      }

      const contenido = [
        area.id_area,
        area.nombre,
        this.nombreEdificio(area),
        area.estado
      ]
        .join(' ')
        .toLowerCase();

      return contenido.includes(texto);
    });
  }

  // ======================================
  // ESTADÍSTICAS
  // ======================================

  get totalAreas(): number {
    return this.areas.length;
  }

  get totalActivas(): number {
    return this.areas.filter(
      area => area.estado === 'Activo'
    ).length;
  }

  get totalInactivas(): number {
    return this.areas.filter(
      area => area.estado === 'Inactivo'
    ).length;
  }

  // ======================================
  // NOMBRE DEL EDIFICIO
  // ======================================

  nombreEdificio(area: Area): string {

    const edificio = this.edificios.find(
      e => e.id_edificio === area.id_edificio
    );

    return (
      edificio?.nombre ||
      area.nombre_edificio ||
      `Edificio #${area.id_edificio}`
    );
  }

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
  // EDIFICIOS DISPONIBLES
  // ======================================

  get edificiosDisponibles(): Edificio[] {

    const idActual = this.editando
      ? this.seleccionado?.id_edificio
      : null;

    return this.edificios.filter(edificio =>
      edificio.estado === 'Activo' ||
      edificio.id_edificio === idActual
    );
  }

  // ======================================
  // COLOR DEL ESTADO
  // ======================================

  colorEstado(estado: EstadoArea): string {

    switch (estado) {

      case 'Activo':
        return 'success';

      case 'Inactivo':
        return 'medium';

      default:
        return 'medium';
    }
  }

  // ======================================
  // TRACK BY
  // ======================================

  trackById(
    _index: number,
    area: Area
  ): number {

    return area.id_area;
  }

  // ======================================
  // REGRESAR
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
  // NUEVA ÁREA
  // ======================================

  nuevaArea(): void {

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

    this.actualizarVista();
  }

  // ======================================
  // CONSULTAR DETALLE
  // ======================================

  async verDetalle(area: Area): Promise<void> {

    if (this.cargandoDetalle) {
      return;
    }

    this.seleccionado = area;
    this.vista = 'detalle';
    this.cargandoDetalle = true;
    this.errorDetalle = '';

    this.actualizarVista();

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/areas/consultar.php`,
          {
            params: {
              id_area: String(area.id_area)
            },

            withCredentials: true
          }
        )
      );

      if (!res.success) {
        throw new Error(
          res.message ||
          'No se pudo consultar el área'
        );
      }

      const data = res.data as
        | { area?: Area }
        | Area
        | undefined;

      const registro = res.area ??
        (
          data && 'area' in data
            ? data.area
            : data
        );

      if (
        !registro ||
        !('id_area' in registro)
      ) {
        throw new Error(
          'No se recibieron los datos del área'
        );
      }

      this.seleccionado =
        this.normalizarArea(registro);

      this.actualizarVista();

    } catch (error) {

      this.errorDetalle = this.obtenerMensajeError(
        error,
        'Error al consultar el área'
      );

      console.error(
        'Aurora Áreas - consultar:',
        error
      );

    } finally {

      this.cargandoDetalle = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // EDITAR ÁREA
  // ======================================

  editarArea(): void {

    if (
      !this.esAdmin ||
      !this.seleccionado
    ) {
      return;
    }

    const area = this.seleccionado;

    this.form = {
      id_area: Number(area.id_area),
      nombre: area.nombre,
      id_edificio: Number(area.id_edificio),
      estado: area.estado
    };

    this.editando = true;
    this.vista = 'formulario';

    if (
      this.edificios.length === 0 &&
      !this.cargandoEdificios
    ) {
      void this.cargarEdificios();
    }

    this.actualizarVista();
  }

  // ======================================
  // VALIDAR FORMULARIO
  // ======================================

  private validarFormulario(): string | null {

    const nombre = this.form.nombre.trim();

    // ====================================
    // NOMBRE
    // ====================================

    if (!nombre) {
      return 'Ingresa el nombre del área';
    }

    if (nombre.length > 120) {
      return (
        'El nombre del área no puede superar ' +
        '120 caracteres'
      );
    }

    // ====================================
    // EDIFICIO
    // ====================================

    const idEdificio =
      Number(this.form.id_edificio);

    if (
      this.form.id_edificio == null ||
      !Number.isInteger(idEdificio) ||
      idEdificio <= 0
    ) {
      return 'Selecciona un edificio válido';
    }

    const edificio = this.edificios.find(
      e => e.id_edificio === idEdificio
    );

    if (!edificio) {
      return (
        'El edificio seleccionado no existe ' +
        'en el catálogo'
      );
    }

    if (
      edificio.estado !== 'Activo' &&
      !(
        this.editando &&
        this.seleccionado?.id_edificio === idEdificio &&
        this.form.estado === 'Inactivo'
      )
    ) {
      return (
        'No puedes asignar un área activa ' +
        'a un edificio inactivo'
      );
    }

    // ====================================
    // ESTADO
    // ====================================

    if (!this.estados.includes(this.form.estado)) {
      return 'Selecciona un estado válido';
    }

    // ====================================
    // REGISTRO DUPLICADO LOCAL
    // ====================================

    const duplicado = this.areas.some(area =>

      area.id_area !== this.form.id_area &&

      area.id_edificio === idEdificio &&

      area.nombre.trim().toLowerCase() ===
        nombre.toLowerCase()
    );

    if (duplicado) {
      return (
        'Ya existe un área con ese nombre ' +
        'en el edificio seleccionado'
      );
    }

    return null;
  }

  // ======================================
  // REGISTRAR Y ACTUALIZAR ÁREA
  // ======================================

  async guardarArea(): Promise<void> {

    if (
      !this.esAdmin ||
      this.guardando
    ) {
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
            id_area: this.form.id_area
          }
        : {}),

      nombre: this.form.nombre.trim(),

      id_edificio: Number(
        this.form.id_edificio
      ),

      estado: this.form.estado
    };

    try {

      const res = await firstValueFrom(

        this.http.post<RespuestaApi>(
          `${this.api}/areas/${accion}.php`,
          payload,
          {
            withCredentials: true
          }
        )
      );

      if (!res.success) {
        throw new Error(
          res.message ||
          'No se pudo guardar el área'
        );
      }

      await this.mostrarToast(
        res.message ||
        'Área guardada correctamente',
        'success'
      );

      this.vista = 'lista';
      this.seleccionado = null;
      this.editando = false;

      this.actualizarVista();

      // Actualización automática.
      await this.cargarAreas();

    } catch (error) {

      await this.mostrarError(
        error,
        'Error al guardar el área'
      );

    } finally {

      this.guardando = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // CONFIRMAR BAJA LÓGICA
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

    const area = this.seleccionado;

    const alerta = await this.alertCtrl.create({

      header: 'Desactivar área',

      message:
        `¿Deseas desactivar el área "${area.nombre}"? ` +
        `Se conservará su historial. ` +
        `La operación puede ser rechazada si ` +
        `existen dependencias activas.`,

      buttons: [
        {
          text: 'Volver',
          role: 'cancel'
        },
        {
          text: 'Desactivar',
          role: 'destructive',

          handler: () => {
            void this.darDeBaja(area.id_area);
          }
        }
      ]
    });

    await alerta.present();
  }

  // ======================================
  // DAR DE BAJA
  // ======================================

  private async darDeBaja(
    idArea: number
  ): Promise<void> {

    if (this.desactivando) {
      return;
    }

    this.desactivando = true;
    this.actualizarVista();

    try {

      // Se espera baja lógica:
      // estado = 'Inactivo'.
      // El PHP debe impedir borrar
      // físicamente información relacionada.

      const res = await firstValueFrom(

        this.http.post<RespuestaApi>(
          `${this.api}/areas/eliminar.php`,
          {
            id_area: idArea
          },
          {
            withCredentials: true
          }
        )
      );

      if (!res.success) {
        throw new Error(
          res.message ||
          'No se pudo desactivar el área'
        );
      }

      await this.mostrarToast(
        res.message ||
        'Área desactivada correctamente',
        'success'
      );

      this.vista = 'lista';
      this.seleccionado = null;

      this.actualizarVista();

      await this.cargarAreas();

    } catch (error) {

      await this.mostrarError(
        error,
        'Error al desactivar el área'
      );

    } finally {

      this.desactivando = false;
      this.actualizarVista();
    }
  }

  // ======================================
  // OBTENER MENSAJES DE ERROR
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
          'Verifica Apache, la ruta PHP y CORS.'
        );
      }

      if (error.status === 200) {
        return (
          'PHP devolvió una respuesta que no ' +
          'es JSON válido. Revisa Network → Response.'
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

  // ======================================
  // MOSTRAR ERRORES
  // ======================================

  private async mostrarError(
    error: unknown,
    predeterminado: string
  ): Promise<void> {

    console.error(
      'Aurora Áreas:',
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
  // NOTIFICACIONES
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
