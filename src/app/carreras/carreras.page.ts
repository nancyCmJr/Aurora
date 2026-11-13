
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
  createOutline,
  saveOutline,
  banOutline,
} from 'ionicons/icons';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';

// ========================================
// TIPOS E INTERFACES
// ========================================

type TipoCarrera =
  | 'Ingenieria'
  | 'Licenciatura'
  | 'Maestria';

type EstadoCarrera = 'Activa' | 'Inactiva';

type Vista = 'lista' | 'detalle' | 'formulario';

type Filtro = 'Todas' | EstadoCarrera;

interface Carrera {
  id_carrera: number;
  nombre: string;
  tipo: TipoCarrera;
  total_creditos: number;
  estado: EstadoCarrera;
}

interface FormularioCarrera {
  nombre: string;
  tipo: TipoCarrera;
  total_creditos: number | null;
  estado: EstadoCarrera;
}

interface RespuestaApi {
  success: boolean;
  message?: string;
}

interface RespuestaListado extends RespuestaApi {
  carreras?: Carrera[];
  total?: number;
}

interface RespuestaConsulta extends RespuestaApi {
  carrera?: Carrera;
}

// ========================================
// FORMULARIO INICIAL
// ========================================

function formularioVacio(): FormularioCarrera {
  return {
    nombre: '',
    tipo: 'Ingenieria',
    total_creditos: null,
    estado: 'Activa',
  };
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

@Component({
  selector: 'app-carreras',
  standalone: true,
  templateUrl: './carreras.page.html',
  styleUrls: ['./carreras.page.scss'],

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

export class CarrerasPage {

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

  filtro: Filtro = 'Todas';

  busqueda = '';

  carreras: Carrera[] = [];

  seleccionada: Carrera | null = null;

  formulario: FormularioCarrera = formularioVacio();

  editando = false;
  cargando = false;
  cargandoDetalle = false;
  guardando = false;
  desactivando = false;

  errorLista = '';
  errorDetalle = '';
  errorFormulario = '';

  constructor() {
    addIcons({
      addOutline,
      arrowBackOutline,
      bookOutline,
      createOutline,
      saveOutline,
      banOutline,
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

    this.cargarCarreras();
  }

  // ======================================
  // FILTRAR CARRERAS
  // ======================================

  get carrerasFiltradas(): Carrera[] {

    const texto = this.busqueda
      .trim()
      .toLowerCase();

    return this.carreras.filter(carrera => {

      if (
        this.filtro !== 'Todas' &&
        carrera.estado !== this.filtro
      ) {
        return false;
      }

      if (!texto) return true;

      return [
        carrera.id_carrera,
        carrera.nombre,
        this.etiquetaTipo(carrera.tipo),
      ].some(valor =>
        String(valor)
          .toLowerCase()
          .includes(texto)
      );

    });
  }

  // Mostrar nombres con acentos
  etiquetaTipo(tipo: TipoCarrera): string {

    switch (tipo) {

      case 'Ingenieria':
        return 'Ingeniería';

      case 'Licenciatura':
        return 'Licenciatura';

      case 'Maestria':
        return 'Maestría';
    }
  }

  // ======================================
  // LISTAR CARRERAS
  // GET: carreras/listar.php
  // ======================================

  cargarCarreras(
    refresher?: HTMLIonRefresherElement
  ): void {

    this.errorLista = '';

    if (!refresher) {
      this.cargando = true;
    }

    this.http.get<RespuestaListado>(
      `${this.api}/carreras/listar.php`,
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
          !Array.isArray(respuesta.carreras)
        ) {

          this.errorLista =
            respuesta.message ||
            'No se pudieron cargar las carreras.';

          this.carreras = [];

          return;
        }

        this.carreras = respuesta.carreras;

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {

        this.errorLista = this.mensajeError(error);

        this.carreras = [];

        this.cdr.markForCheck();
      },

    });
  }

  // ======================================
  // ACTUALIZAR LISTA DESLIZANDO
  // ======================================

  refrescar(evento: Event): void {

    this.cargarCarreras(
      evento.target as HTMLIonRefresherElement
    );
  }

  // ======================================
  // CONSULTAR CARRERA
  // GET: carreras/consultar.php
  // ======================================

  abrirDetalle(carrera: Carrera): void {

    if (this.cargandoDetalle) return;

    this.errorDetalle = '';
    this.cargandoDetalle = true;

    this.http.get<RespuestaConsulta>(
      `${this.api}/carreras/consultar.php`,
      {
        params: {
          id_carrera: String(carrera.id_carrera),
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
          !respuesta.carrera
        ) {

          this.errorDetalle =
            respuesta.message ||
            'No se pudo consultar la carrera.';

          return;
        }

        this.seleccionada = respuesta.carrera;

        this.vista = 'detalle';

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {

        this.errorDetalle =
          this.mensajeError(error);

        this.cdr.markForCheck();
      },

    });
  }

  // ======================================
  // NUEVA CARRERA
  // ======================================

  nueva(): void {

    this.editando = false;

    this.seleccionada = null;

    this.formulario = formularioVacio();

    this.errorFormulario = '';

    this.vista = 'formulario';
  }

  // ======================================
  // EDITAR CARRERA
  // ======================================

  editar(): void {

    if (!this.seleccionada) return;

    this.editando = true;
    this.errorFormulario = '';

    this.formulario = {

      nombre: this.seleccionada.nombre,

      tipo: this.seleccionada.tipo,

      total_creditos:
        Number(this.seleccionada.total_creditos),

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
      this.desactivando
    ) {
      return;
    }

    this.errorFormulario = '';
    this.errorDetalle = '';

    if (
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
  // GUARDAR CARRERA
  // POST: registrar.php / actualizar.php
  // ======================================

  guardar(): void {

    if (this.guardando) return;

    this.errorFormulario = '';

    // Normalizar datos

    const nombre =
      this.formulario.nombre.trim();

    const tipo = this.formulario.tipo;

    const creditos =
      Number(this.formulario.total_creditos);

    const estado = this.formulario.estado;

    // Validar nombre

    if (!nombre) {

      this.errorFormulario =
        'Ingresa el nombre de la carrera.';

      return;
    }

    if (nombre.length > 120) {

      this.errorFormulario =
        'El nombre debe tener máximo 120 caracteres.';

      return;
    }

    // Validar tipo

    if (
      ![
        'Ingenieria',
        'Licenciatura',
        'Maestria',
      ].includes(tipo)
    ) {

      this.errorFormulario =
        'Selecciona un tipo de carrera válido.';

      return;
    }

    // Validar créditos

    if (
      !Number.isSafeInteger(creditos) ||
      creditos <= 0
    ) {

      this.errorFormulario =
        'Los créditos deben ser un número entero mayor que cero.';

      return;
    }

    // Validar estado

    if (
      !['Activa', 'Inactiva'].includes(estado)
    ) {

      this.errorFormulario =
        'Selecciona un estado válido.';

      return;
    }

    if (
      this.editando &&
      !this.seleccionada
    ) {
      return;
    }

    // Preparar JSON

    const cuerpo = {

      ...(this.editando
        ? {
            id_carrera:
              this.seleccionada!.id_carrera,
          }
        : {}),

      nombre,
      tipo,
      total_creditos: creditos,
      estado,

    };

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    this.guardando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/carreras/${accion}.php`,
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
            'No se pudo guardar la carrera.';

          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Carrera guardada correctamente.'
        );

        this.seleccionada = null;

        this.vista = 'lista';

        this.cargarCarreras();
      },

      error: (error: HttpErrorResponse) => {

        this.errorFormulario =
          this.mensajeError(error);

        this.cdr.markForCheck();
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
      this.seleccionada.estado === 'Inactiva'
    ) {
      return;
    }

    const alerta = await this.alertas.create({

      header: 'Desactivar carrera',

      message:
        `¿Deseas desactivar ` +
        `${this.seleccionada.nombre}? ` +
        `Sus registros relacionados no se eliminarán.`,

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
  // DESACTIVAR CARRERA
  // POST: carreras/eliminar.php
  // ======================================

  private desactivar(): void {

    if (!this.seleccionada) return;

    this.desactivando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/carreras/eliminar.php`,
      {
        id_carrera:
          this.seleccionada.id_carrera,
      },
      {
        withCredentials: true,
      }
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
            respuesta.message ||
            'No se pudo desactivar.',
            'danger'
          );

          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Carrera desactivada.'
        );

        this.seleccionada = null;

        this.vista = 'lista';

        this.cargarCarreras();
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
  // MANEJO DE ERRORES
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
  // NOTIFICACIONES
  // ======================================

  private async mostrarToast(
    mensaje: string,
    color: 'success' | 'danger' = 'success'
  ): Promise<void> {

    const toast = await this.toasts.create({
      message: mensaje,
      color,
      duration: 2400,
    });

    await toast.present();
  }

}
