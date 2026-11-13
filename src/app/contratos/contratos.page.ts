
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
  IonInput,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  AlertController,
  ToastController
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  addOutline,
  arrowBackOutline,
  createOutline,
  trashOutline,
  refreshOutline,
  documentTextOutline,
  saveOutline,
  searchOutline
} from 'ionicons/icons';

import { environment } from '../../environments/environment';

// ==========================================
// TIPOS
// ==========================================

type RolContrato =
  | 'Docente'
  | 'Profesor honorario'
  | 'Jefe base';

type EstadoContrato =
  | 'Activo'
  | 'Inactivo'
  | 'Vencido';

type Vista = 'lista' | 'detalle' | 'formulario';

// ==========================================
// INTERFACES
// ==========================================

interface Contrato {
  id_contrato: number;
  id_docente: number;
  id_area: number;
  folio_contrato: string;
  horas: number;
  rol: RolContrato;
  status: EstadoContrato;
  fecha_inicio: string;
  fecha_fin: string | null;

  nombre_docente?: string;
  nombre_area?: string;
}

interface FormContrato {
  id_contrato?: number;
  id_docente: number | null;
  id_area: number | null;
  folio_contrato: string;
  horas: number | null;
  rol: RolContrato;
  status: EstadoContrato;
  fecha_inicio: string;
  fecha_fin: string;
}

interface Docente {
  id_docente: number;
  codigo?: string;
  nombre: string;
  seg_nombre?: string | null;
  apellidos?: string;
  estado?: string;
}

interface Area {
  id_area: number;
  nombre: string;
  estado?: string;
}

interface RespuestaApi<T = unknown> {
  success: boolean;
  message?: string;
  total?: number;

  contratos?: Contrato[];
  contrato?: Contrato;

  docentes?: Docente[];
  areas?: Area[];

  data?: T;
}

// ==========================================
// COMPONENTE
// ==========================================

@Component({
  selector: 'app-contratos',
  templateUrl: './contratos.page.html',
  styleUrls: ['./contratos.page.scss'],
  standalone: true,

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
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner
  ]
})

export class ContratosPage {

  // ======================================
  // CONFIGURACIÓN DE API
  // ======================================

  private readonly api =
    environment.apiUrl.replace(/\/$/, '');

  // ======================================
  // VARIABLES GENERALES
  // ======================================

  vista: Vista = 'lista';

  contratos: Contrato[] = [];
  docentes: Docente[] = [];
  areas: Area[] = [];

  seleccionado: Contrato | null = null;

  busqueda = '';
  filtroEstado = 'Todos';

  // ======================================
  // ESTADOS DE CARGA
  // ======================================

  cargando = false;
  cargandoDetalle = false;
  guardando = false;

  editando = false;

  // ======================================
  // FORMULARIO
  // ======================================

  form: FormContrato = this.formVacio();

  // ======================================
  // OPCIONES DE CATÁLOGOS
  // ======================================

  readonly roles: RolContrato[] = [
    'Docente',
    'Profesor honorario',
    'Jefe base'
  ];

  readonly estados: EstadoContrato[] = [
    'Activo',
    'Inactivo',
    'Vencido'
  ];

  // ======================================
  // CONSTRUCTOR
  // ======================================

  constructor(
    private http: HttpClient,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,

    // NUEVO:
    // Detecta y programa la actualización
    // de la vista después de las peticiones.

    private cdr: ChangeDetectorRef
  ) {

    addIcons({
      addOutline,
      arrowBackOutline,
      createOutline,
      trashOutline,
      refreshOutline,
      documentTextOutline,
      saveOutline,
      searchOutline
    });
  }

  // ======================================
  // ACTUALIZAR VISTA
  // ======================================

  /**
   * Notifica a Angular que hay cambios
   * que deben reflejarse en la pantalla.
   */
  private actualizarVista(): void {
    this.cdr.markForCheck();
  }

  // ======================================
  // CICLO DE VIDA DE IONIC
  // ======================================

  /**
   * Se ejecuta cada vez que el usuario
   * entra al módulo de contratos.
   *
   * Carga automáticamente:
   * - Contratos
   * - Docentes
   * - Áreas
   */
  ionViewWillEnter(): void {

    this.vista = 'lista';

    // Cargar al entrar, sin necesidad
    // de presionar el botón Actualizar.

    void this.cargarDatos();
  }

  // ======================================
  // FORMULARIO VACÍO
  // ======================================

  private formVacio(): FormContrato {

    return {
      id_docente: null,
      id_area: null,

      folio_contrato: '',
      horas: null,

      rol: 'Docente',
      status: 'Activo',

      fecha_inicio: '',
      fecha_fin: ''
    };
  }

  // ======================================
  // CARGAR INFORMACIÓN GENERAL
  // ======================================

  async cargarDatos(): Promise<void> {

    try {

      // Las tres consultas se ejecutan
      // al mismo tiempo.

      await Promise.all([
        this.cargarContratos(),
        this.cargarDocentes(),
        this.cargarAreas()
      ]);

    } catch (error) {

      console.error(
        'Error al cargar información de contratos:',
        error
      );

    } finally {

      // IMPORTANTE:
      // Actualizar la pantalla al terminar
      // la carga de todos los catálogos.

      this.actualizarVista();
    }
  }

  // ======================================
  // CARGAR CONTRATOS
  // ======================================

  async cargarContratos(): Promise<void> {

    this.cargando = true;

    // Mostrar automáticamente el spinner.
    this.actualizarVista();

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/contratos/listar.php`,
          {
            withCredentials: true
          }
        )
      );

      // ====================================
      // VALIDAR RESPUESTA
      // ====================================

      if (!res.success) {

        throw new Error(
          res.message ||
          'No se pudieron cargar los contratos'
        );
      }

      // ====================================
      // OBTENER REGISTROS
      // ====================================

      const data = res.data as
        | { contratos?: Contrato[] }
        | Contrato[]
        | undefined;

      const lista = res.contratos ??
        (
          Array.isArray(data)
            ? data
            : data?.contratos
        ) ??
        [];

      // ====================================
      // NORMALIZAR DATOS
      // ====================================

      this.contratos = lista.map(c => ({
        ...c,

        id_contrato: Number(c.id_contrato),
        id_docente: Number(c.id_docente),
        id_area: Number(c.id_area),
        horas: Number(c.horas)
      }));

      console.log(
        'Aurora - Contratos cargados:',
        this.contratos.length
      );

      // CORRECCIÓN:
      // Actualizar la vista apenas llegan
      // los contratos desde PHP.

      this.actualizarVista();

    } catch (error) {

      this.contratos = [];

      this.actualizarVista();

      await this.mostrarError(
        error,
        'Error al cargar contratos'
      );

    } finally {

      this.cargando = false;

      // CORRECCIÓN:
      // Ocultar el spinner y mostrar
      // los registros obtenidos.

      this.actualizarVista();
    }
  }

  // ======================================
  // CARGAR DOCENTES
  // ======================================

  async cargarDocentes(): Promise<void> {

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/docentes/listar.php`,
          {
            withCredentials: true
          }
        )
      );

      if (!res.success) {

        throw new Error(
          res.message ||
          'Error al cargar docentes'
        );
      }

      const data = res.data as
        | { docentes?: Docente[] }
        | Docente[]
        | undefined;

      const lista = res.docentes ??
        (
          Array.isArray(data)
            ? data
            : data?.docentes
        ) ??
        [];

      this.docentes = lista.map(d => ({
        ...d,
        id_docente: Number(d.id_docente)
      }));

      // Actualizar nombres de docentes
      // en la lista de contratos.

      this.actualizarVista();

    } catch (error) {

      this.docentes = [];

      this.actualizarVista();

      await this.mostrarError(
        error,
        'Error al cargar docentes'
      );

    } finally {

      this.actualizarVista();
    }
  }

  // ======================================
  // CARGAR ÁREAS
  // ======================================

  async cargarAreas(): Promise<void> {

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
          'Error al cargar áreas'
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
        ) ??
        [];

      this.areas = lista.map(a => ({
        ...a,
        id_area: Number(a.id_area)
      }));

      // Actualizar nombres de áreas
      // cuando termina su consulta.

      this.actualizarVista();

    } catch (error) {

      this.areas = [];

      this.actualizarVista();

      await this.mostrarError(
        error,
        'Error al cargar áreas'
      );

    } finally {

      this.actualizarVista();
    }
  }

  // ======================================
  // BÚSQUEDA Y FILTROS
  // ======================================

  get contratosFiltrados(): Contrato[] {

    const q = this.busqueda
      .toLowerCase()
      .trim();

    return this.contratos.filter(c => {

      const coincideEstado =
        this.filtroEstado === 'Todos' ||
        c.status === this.filtroEstado;

      const texto = [
        c.folio_contrato,
        this.nombreDocente(c),
        this.nombreArea(c),
        c.rol
      ]
        .join(' ')
        .toLowerCase();

      return coincideEstado && texto.includes(q);
    });
  }

  // ======================================
  // CONTADORES
  // ======================================

  get totalActivos(): number {

    return this.contratos.filter(
      c => c.status === 'Activo'
    ).length;
  }

  get totalInactivos(): number {

    return this.contratos.filter(
      c => c.status === 'Inactivo'
    ).length;
  }

  get totalVencidos(): number {

    return this.contratos.filter(
      c => c.status === 'Vencido'
    ).length;
  }

  // ======================================
  // NOMBRE DEL DOCENTE
  // ======================================

  nombreDocente(c: Contrato): string {

    const d = this.docentes.find(
      x =>
        Number(x.id_docente) ===
        Number(c.id_docente)
    );

    if (d) {

      return [
        d.nombre,
        d.seg_nombre,
        d.apellidos
      ]
        .filter(Boolean)
        .join(' ');
    }

    return (
      c.nombre_docente ||
      `Docente #${c.id_docente}`
    );
  }

  // ======================================
  // NOMBRE DEL ÁREA
  // ======================================

  nombreArea(c: Contrato): string {

    const a = this.areas.find(
      x =>
        Number(x.id_area) ===
        Number(c.id_area)
    );

    return (
      a?.nombre ||
      c.nombre_area ||
      `Área #${c.id_area}`
    );
  }

  // ======================================
  // COLOR DEL ESTADO
  // ======================================

  colorEstado(estado: EstadoContrato): string {

    switch (estado) {

      case 'Activo':
        return 'success';

      case 'Inactivo':
        return 'medium';

      case 'Vencido':
        return 'warning';
    }
  }

  // ======================================
  // OPTIMIZACIÓN DEL LISTADO
  // ======================================

  trackById(
    _index: number,
    c: Contrato
  ): number {

    return c.id_contrato;
  }

  // ======================================
  // NAVEGACIÓN ENTRE VISTAS
  // ======================================

  volver(): void {

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
  // NUEVO CONTRATO
  // ======================================

  nuevoContrato(): void {

    this.form = this.formVacio();

    this.seleccionado = null;

    this.editando = false;

    this.vista = 'formulario';

    this.actualizarVista();
  }

  // ======================================
  // CONSULTAR DETALLE
  // ======================================

  async verDetalle(c: Contrato): Promise<void> {

    if (this.cargandoDetalle) {
      return;
    }

    this.seleccionado = c;

    this.vista = 'detalle';

    this.cargandoDetalle = true;

    this.actualizarVista();

    try {

      const res = await firstValueFrom(

        this.http.get<RespuestaApi>(
          `${this.api}/contratos/consultar.php`,
          {
            params: {
              id_contrato: String(c.id_contrato)
            },

            withCredentials: true
          }
        )
      );

      if (!res.success) {

        throw new Error(
          res.message ||
          'No se pudo consultar el contrato'
        );
      }

      const data = res.data as
        | { contrato?: Contrato }
        | Contrato
        | undefined;

      const contrato = res.contrato ??
        (
          data && 'contrato' in data
            ? data.contrato
            : data
        );

      if (
        contrato &&
        'id_contrato' in contrato
      ) {

        this.seleccionado = {
          ...contrato,

          id_contrato:
            Number(contrato.id_contrato),

          id_docente:
            Number(contrato.id_docente),

          id_area:
            Number(contrato.id_area),

          horas:
            Number(contrato.horas)
        };

        this.actualizarVista();
      }

    } catch (error) {

      await this.mostrarError(
        error,
        'No se pudo consultar el contrato'
      );

    } finally {

      this.cargandoDetalle = false;

      this.actualizarVista();
    }
  }

  // ======================================
  // EDITAR CONTRATO
  // ======================================

  editarContrato(): void {

    if (!this.seleccionado) {
      return;
    }

    const c = this.seleccionado;

    this.form = {
      id_contrato: Number(c.id_contrato),
      id_docente: Number(c.id_docente),
      id_area: Number(c.id_area),

      folio_contrato: c.folio_contrato,

      horas: Number(c.horas),

      rol: c.rol,
      status: c.status,

      fecha_inicio:
        c.fecha_inicio?.slice(0, 10) || '',

      fecha_fin:
        c.fecha_fin?.slice(0, 10) || ''
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

    // ====================================
    // VALIDAR DOCENTE
    // ====================================

    if (
      !f.id_docente ||
      Number(f.id_docente) <= 0
    ) {

      return 'Selecciona un docente';
    }

    // ====================================
    // VALIDAR ÁREA
    // ====================================

    if (
      !f.id_area ||
      Number(f.id_area) <= 0
    ) {

      return 'Selecciona un área';
    }

    // ====================================
    // VALIDAR FOLIO
    // ====================================

    const folio = f.folio_contrato.trim();

    if (!folio) {

      return 'Ingresa el folio del contrato';
    }

    if (folio.length > 30) {

      return (
        'El folio no puede superar 30 caracteres'
      );
    }

    // ====================================
    // VALIDAR HORAS
    // ====================================

    if (
      f.horas === null ||
      f.horas === undefined
    ) {

      return 'Ingresa las horas del contrato';
    }

    const horas = Number(f.horas);

    if (
      !Number.isInteger(horas) ||
      horas <= 0
    ) {

      return (
        'Las horas deben ser un número ' +
        'entero positivo'
      );
    }

    // ====================================
    // VALIDAR ROL
    // ====================================

    if (!this.roles.includes(f.rol)) {

      return 'Selecciona un rol válido';
    }

    // ====================================
    // VALIDAR ESTADO
    // ====================================

    if (!this.estados.includes(f.status)) {

      return 'Selecciona un estado válido';
    }

    // ====================================
    // VALIDAR FECHAS
    // ====================================

    const patron = /^\d{4}-\d{2}-\d{2}$/;

    if (!patron.test(f.fecha_inicio)) {

      return (
        'Selecciona una fecha de inicio válida'
      );
    }

    if (
      f.fecha_fin &&
      !patron.test(f.fecha_fin)
    ) {

      return (
        'La fecha de finalización no es válida'
      );
    }

    if (
      f.fecha_fin &&
      f.fecha_fin < f.fecha_inicio
    ) {

      return (
        'La fecha final no puede ser ' +
        'anterior a la inicial'
      );
    }

    return null;
  }

  // ======================================
  // REGISTRAR O ACTUALIZAR
  // ======================================

  async guardarContrato(): Promise<void> {

    if (this.guardando) {
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

    // ====================================
    // INICIAR GUARDADO
    // ====================================

    this.guardando = true;

    this.actualizarVista();

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    const payload = {

      ...(this.editando
        ? {
            id_contrato: this.form.id_contrato
          }
        : {}),

      id_docente:
        Number(this.form.id_docente),

      id_area:
        Number(this.form.id_area),

      folio_contrato:
        this.form.folio_contrato.trim(),

      horas:
        Number(this.form.horas),

      rol:
        this.form.rol,

      status:
        this.form.status,

      fecha_inicio:
        this.form.fecha_inicio,

      fecha_fin:
        this.form.fecha_fin || null
    };

    try {

      // ==================================
      // ENVIAR A PHP
      // ==================================

      const res = await firstValueFrom(

        this.http.post<RespuestaApi>(
          `${this.api}/contratos/${accion}.php`,
          payload,
          {
            withCredentials: true
          }
        )
      );

      if (!res.success) {

        throw new Error(
          res.message ||
          'No se pudo guardar el contrato'
        );
      }

      // ==================================
      // NOTIFICAR OPERACIÓN
      // ==================================

      await this.mostrarToast(

        res.message ||
        'Contrato guardado correctamente',

        'success'
      );

      // ==================================
      // REGRESAR AL LISTADO
      // ==================================

      this.vista = 'lista';

      this.seleccionado = null;

      this.editando = false;

      this.actualizarVista();

      // ==================================
      // ACTUALIZAR AUTOMÁTICAMENTE
      // ==================================

      await this.cargarContratos();

    } catch (error) {

      await this.mostrarError(
        error,
        'Error al guardar el contrato'
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

    const c = this.seleccionado;

    if (
      !c ||
      c.status !== 'Activo'
    ) {
      return;
    }

    const alert = await this.alertCtrl.create({

      header: 'Dar de baja contrato',

      message:
        `¿Deseas desactivar el contrato ` +
        `${c.folio_contrato}? ` +
        `Se conservará su historial.`,

      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Dar de baja',
          role: 'destructive',

          handler: () => {

            void this.darDeBaja(c.id_contrato);
          }
        }
      ]
    });

    await alert.present();
  }

  // ======================================
  // DAR DE BAJA CONTRATO
  // ======================================

  private async darDeBaja(
    id: number
  ): Promise<void> {

    try {

      const res = await firstValueFrom(

        this.http.post<RespuestaApi>(
          `${this.api}/contratos/eliminar.php`,
          {
            id_contrato: id
          },
          {
            withCredentials: true
          }
        )
      );

      if (!res.success) {

        throw new Error(
          res.message ||
          'No se pudo dar de baja'
        );
      }

      await this.mostrarToast(

        res.message ||
        'Contrato dado de baja',

        'success'
      );

      this.vista = 'lista';

      this.seleccionado = null;

      this.actualizarVista();

      // Recargar contratos para reflejar
      // automáticamente la baja lógica.

      await this.cargarContratos();

    } catch (error) {

      await this.mostrarError(
        error,
        'Error al dar de baja'
      );

    } finally {

      this.actualizarVista();
    }
  }

  // ======================================
  // MOSTRAR ERRORES
  // ======================================

  private async mostrarError(
    error: unknown,
    predeterminado: string
  ): Promise<void> {

    let mensaje = predeterminado;

    if (error instanceof HttpErrorResponse) {

      if (
        typeof error.error?.message === 'string'
      ) {

        mensaje = error.error.message;

      } else if (error.status === 0) {

        mensaje = (
          'No se pudo conectar con el servidor'
        );

      } else if (error.status === 200) {

        mensaje = (
          'El servidor devolvió una respuesta ' +
          'que no es JSON válido'
        );
      }

    } else if (error instanceof Error) {

      mensaje = error.message;
    }

    console.error(
      'Aurora Contratos:',
      error
    );

    await this.mostrarToast(
      mensaje,
      'danger'
    );
  }

  // ======================================
  // MOSTRAR NOTIFICACIONES
  // ======================================

  private async mostrarToast(
    mensaje: string,
    color: string = 'primary'
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
