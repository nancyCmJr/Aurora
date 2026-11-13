
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

type EstadoDocente = 'Activo' | 'Inactivo' | 'Baja';

type Vista = 'lista' | 'detalle' | 'formulario';

type Filtro = 'Todos' | EstadoDocente;

interface DetalleDocente {
  curp: string;
  rfc: string;
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
  fecha_ingreso: string;
}

interface Docente {
  id_docente: number;
  codigo: string;
  cedula?: string | null;
  nombre: string;
  seg_nombre?: string | null;
  apellidos: string;
  titulo_academico?: string | null;
  estado: EstadoDocente;

  detalle?: Partial<DetalleDocente> | null;
  detalle_docente?: Partial<DetalleDocente> | null;

  estado_domicilio?: string | null;

  // Compatibilidad con respuestas planas de PHP
  curp?: string | null;
  rfc?: string | null;
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
  fecha_ingreso?: string | null;
}

interface FormularioDocente {
  codigo: string;
  cedula: string;
  nombre: string;
  seg_nombre: string;
  apellidos: string;
  titulo_academico: string;
  estado: EstadoDocente;
  detalle: DetalleDocente;
}

interface RespuestaApi<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// ========================================
// FORMULARIOS INICIALES
// ========================================

function detalleVacio(): DetalleDocente {
  return {
    curp: '',
    rfc: '',
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
    fecha_ingreso: '',
  };
}

function formularioVacio(): FormularioDocente {
  return {
    codigo: '',
    cedula: '',
    nombre: '',
    seg_nombre: '',
    apellidos: '',
    titulo_academico: '',
    estado: 'Activo',

    detalle: detalleVacio(),
  };
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

@Component({
  selector: 'app-docentes',
  standalone: true,
  templateUrl: './docentes.page.html',
  styleUrls: ['./docentes.page.scss'],

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

export class DocentesPage {

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
  // VARIABLES DE LA PÁGINA
  // ======================================

  vista: Vista = 'lista';

  filtro: Filtro = 'Todos';

  busqueda = '';

  docentes: Docente[] = [];

  seleccionado: Docente | null = null;

  detalleSeleccionado: DetalleDocente =
    detalleVacio();

  formulario: FormularioDocente =
    formularioVacio();

  editando = false;
  cargando = false;
  cargandoDetalle = false;
  guardando = false;
  dandoDeBaja = false;

  errorLista = '';
  errorFormulario = '';

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
  // ENTRADA AL MÓDULO
  // ======================================

  ionViewWillEnter(): void {

    const usuario = this.auth.obtenerUsuario();

    if (usuario?.rol !== 'Admin') {

      void this.router.navigateByUrl('/home', {
        replaceUrl: true,
      });

      return;
    }

    this.vista = 'lista';

    this.cargarDocentes();
  }

  // ======================================
  // BÚSQUEDA Y FILTROS
  // ======================================

  get docentesFiltrados(): Docente[] {

    const termino = this.busqueda
      .trim()
      .toLowerCase();

    return this.docentes.filter(docente => {

      if (
        this.filtro !== 'Todos' &&
        docente.estado !== this.filtro
      ) {
        return false;
      }

      if (!termino) return true;

      return [
        docente.codigo,
        docente.nombre,
        docente.seg_nombre,
        docente.apellidos,
        docente.cedula,
        docente.titulo_academico,
      ].some(campo =>

        String(campo ?? '')
          .toLowerCase()
          .includes(termino)

      );
    });
  }

  nombreCompleto(docente: Docente): string {

    return [
      docente.nombre,
      docente.seg_nombre,
      docente.apellidos,
    ]
      .filter(Boolean)
      .join(' ');
  }

  mostrar(valor?: string | null): string {

    return valor && valor.trim()
      ? valor
      : 'No registrado';
  }

  // ======================================
  // LISTAR DOCENTES
  // GET: docentes/listar.php
  // ======================================

  cargarDocentes(
    refresher?: HTMLIonRefresherElement
  ): void {

    this.errorLista = '';

    if (!refresher) {
      this.cargando = true;
    }

    this.http.get<RespuestaApi<Docente[]>>(
      `${this.api}/docentes/listar.php`,
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
            'No se pudo obtener el listado.';

          return;
        }

        this.docentes = respuesta.data;

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {

        this.errorLista =
          this.mensajeError(error);

        this.cdr.markForCheck();
      },

    });
  }

  // ======================================
  // ACTUALIZAR LISTA
  // ======================================

  refrescar(evento: Event): void {

    this.cargarDocentes(
      evento.target as HTMLIonRefresherElement
    );
  }

  // ======================================
  // CONSULTAR DOCENTE
  // GET: docentes/consultar.php
  // ======================================

  abrirDetalle(docente: Docente): void {

    if (this.cargandoDetalle) return;

    this.cargandoDetalle = true;
    this.errorLista = '';

    this.http.get<RespuestaApi<Docente>>(
      `${this.api}/docentes/consultar.php`,
      {
        params: {
          id_docente: String(docente.id_docente),
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
          !respuesta.data
        ) {

          this.errorLista =
            respuesta.message ||
            'No se pudo abrir el expediente.';

          return;
        }

        // Acepta datos directos o anidados

        const data = respuesta.data as Docente & {
          docente?: Docente;
        };

        const registro = data.docente
          ? {
              ...data.docente,
              detalle:
                data.detalle ??
                data.docente.detalle,
            }
          : data;

        if (!registro.id_docente) {

          this.errorLista =
            'El endpoint no devolvió un docente válido.';

          return;
        }

        this.seleccionado = registro;

        // Obtener los datos complementarios
        this.detalleSeleccionado =
          this.leerDetalle(registro);

        this.vista = 'detalle';

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {

        this.errorLista =
          this.mensajeError(error);

        this.cdr.markForCheck();
      },

    });
  }

  // ======================================
  // NUEVO DOCENTE
  // ======================================

  nuevo(): void {

    this.editando = false;

    this.seleccionado = null;

    this.formulario = formularioVacio();

    this.errorFormulario = '';

    this.vista = 'formulario';
  }

  // ======================================
  // EDITAR DOCENTE
  // ======================================

  editar(): void {

    if (!this.seleccionado) return;

    const docente = this.seleccionado;

    this.editando = true;

    this.errorFormulario = '';

    this.formulario = {

      codigo: docente.codigo ?? '',
      cedula: docente.cedula ?? '',
      nombre: docente.nombre ?? '',
      seg_nombre: docente.seg_nombre ?? '',
      apellidos: docente.apellidos ?? '',

      titulo_academico:
        docente.titulo_academico ?? '',

      estado: docente.estado,

      detalle: {
        ...this.detalleSeleccionado,
      },
    };

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
  // GUARDAR DOCENTE
  // POST: registrar.php / actualizar.php
  // ======================================

  guardar(): void {

    if (this.guardando) return;

    this.errorFormulario = '';

    const f = this.formulario;

    // Normalizar datos principales

    f.codigo = f.codigo.trim();
    f.nombre = f.nombre.trim();
    f.seg_nombre = f.seg_nombre.trim();
    f.apellidos = f.apellidos.trim();
    f.cedula = f.cedula.trim();

    f.titulo_academico =
      f.titulo_academico.trim();

    // Normalizar datos personales

    f.detalle.curp =
      f.detalle.curp.trim().toUpperCase();

    f.detalle.rfc =
      f.detalle.rfc.trim().toUpperCase();

    f.detalle.email =
      f.detalle.email.trim().toLowerCase();

    // Validar campos obligatorios

    if (
      !f.codigo ||
      !f.nombre ||
      !f.apellidos
    ) {

      this.errorFormulario =
        'Código, nombre y apellidos son obligatorios.';

      return;
    }

    if (f.codigo.length > 20) {

      this.errorFormulario =
        'El código no puede superar 20 caracteres.';

      return;
    }

    // Validar CURP

    if (
      f.detalle.curp &&
      !/^[A-Z0-9]{18}$/.test(f.detalle.curp)
    ) {

      this.errorFormulario =
        'La CURP debe tener 18 caracteres alfanuméricos.';

      return;
    }

    // Validar RFC

    if (
      f.detalle.rfc &&
      !/^[A-ZÑ&0-9]{12,13}$/.test(f.detalle.rfc)
    ) {

      this.errorFormulario =
        'El RFC debe tener 12 o 13 caracteres válidos.';

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
        'Escribe un correo electrónico válido.';

      return;
    }

    // Validar código postal

    if (
      f.detalle.codigo_postal.trim() &&
      !/^\d{5}$/.test(
        f.detalle.codigo_postal.trim()
      )
    ) {

      this.errorFormulario =
        'El código postal debe tener cinco dígitos.';

      return;
    }

    // Convertir campos opcionales vacíos a null

    const detalle = Object.fromEntries(
      Object.entries(f.detalle).map(
        ([clave, valor]) => [
          clave,
          valor.trim() || null,
        ]
      )
    );

    // Preparar los datos para PHP

    const cuerpo = {

      ...(this.editando && this.seleccionado
        ? {
            id_docente:
              this.seleccionado.id_docente,
          }
        : {}),

      codigo: f.codigo,
      cedula: f.cedula || null,
      nombre: f.nombre,
      seg_nombre: f.seg_nombre || null,
      apellidos: f.apellidos,

      titulo_academico:
        f.titulo_academico || null,

      estado: f.estado,

      detalle,
    };

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    this.guardando = true;

    this.http.post<RespuestaApi<unknown>>(
      `${this.api}/docentes/${accion}.php`,
      cuerpo,
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
            'No se pudo guardar.';

          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Docente guardado correctamente.'
        );

        this.seleccionado = null;

        this.vista = 'lista';

        this.cargarDocentes();
      },

      error: (error: HttpErrorResponse) => {

        this.errorFormulario =
          this.mensajeError(error);

        this.cdr.markForCheck();
      },

    });
  }

  // ======================================
  // CONFIRMAR BAJA
  // ======================================

  async confirmarBaja(): Promise<void> {

    if (
      !this.seleccionado ||
      this.dandoDeBaja ||
      this.seleccionado.estado === 'Baja'
    ) {
      return;
    }

    const alerta = await this.alertas.create({

      header: 'Dar de baja al docente',

      message:
        `¿Confirmas la baja de ` +
        `${this.nombreCompleto(this.seleccionado)}? ` +
        `Se conservará su información.`,

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
  // POST: docentes/eliminar.php
  // ======================================

  private darDeBaja(): void {

    if (!this.seleccionado) return;

    this.dandoDeBaja = true;

    this.http.post<RespuestaApi<unknown>>(
      `${this.api}/docentes/eliminar.php`,
      {
        id_docente:
          this.seleccionado.id_docente,
      },
      {
        withCredentials: true,
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
            'No se pudo dar de baja.',
            'danger'
          );

          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Docente dado de baja.'
        );

        this.seleccionado = null;

        this.vista = 'lista';

        this.cargarDocentes();
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
  // LEER DATOS COMPLEMENTARIOS
  // CORREGIDO
  // ======================================

  private leerDetalle(
    docente: Docente
  ): DetalleDocente {

    /*
     * Los datos pueden llegar:
     *
     * 1. En docente.detalle
     * 2. En docente.detalle_docente
     * 3. Directamente en docente
     *
     * Asignamos cada propiedad explícitamente.
     * Así evitamos errores de indexación de
     * propiedades dinámicas en TypeScript.
     */

    const d =
      docente.detalle ??
      docente.detalle_docente;

    return {

      curp: this.texto(
        d?.curp ?? docente.curp
      ),

      rfc: this.texto(
        d?.rfc ?? docente.rfc
      ),

      fecha_nacimiento: this.normalizarFecha(
        this.texto(
          d?.fecha_nacimiento ??
          docente.fecha_nacimiento
        )
      ),

      telefono: this.texto(
        d?.telefono ?? docente.telefono
      ),

      email: this.texto(
        d?.email ?? docente.email
      ),

      calle: this.texto(
        d?.calle ?? docente.calle
      ),

      numero_exterior: this.texto(
        d?.numero_exterior ??
        docente.numero_exterior
      ),

      numero_interior: this.texto(
        d?.numero_interior ??
        docente.numero_interior
      ),

      colonia: this.texto(
        d?.colonia ?? docente.colonia
      ),

      codigo_postal: this.texto(
        d?.codigo_postal ??
        docente.codigo_postal
      ),

      municipio: this.texto(
        d?.municipio ?? docente.municipio
      ),

      /*
       * No utilizamos docente.estado
       * porque corresponde al estado laboral:
       * Activo, Inactivo o Baja.
       */

      estado: this.texto(
        d?.estado ??
        docente.estado_domicilio
      ),

      referencias: this.texto(
        d?.referencias ??
        docente.referencias
      ),

      fecha_ingreso: this.normalizarFecha(
        this.texto(
          d?.fecha_ingreso ??
          docente.fecha_ingreso
        )
      ),

    };
  }

  // ======================================
  // CONVERTIR VALORES A TEXTO
  // ======================================

  private texto(
    valor: string | null | undefined
  ): string {

    return typeof valor === 'string'
      ? valor
      : '';
  }

  // ======================================
  // NORMALIZAR FECHAS
  // ======================================

  private normalizarFecha(
    fecha: string
  ): string {

    return fecha
      ? fecha.slice(0, 10)
      : '';
  }

  // ======================================
  // MANEJAR ERRORES HTTP
  // ======================================

  private mensajeError(
    error: HttpErrorResponse
  ): string {

    if (error.status === 0) {

      return (
        'No se pudo conectar con la API. ' +
        'Verifica tu conexión.'
      );
    }

    if (
      typeof error.error?.message === 'string'
    ) {

      return error.error.message;
    }

    return `Error del servidor (${error.status}).`;
  }

  // ======================================
  // MOSTRAR NOTIFICACIONES
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
