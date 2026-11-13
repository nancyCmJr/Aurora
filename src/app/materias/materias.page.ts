
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

type EstadoMateria = 'Activa' | 'Inactiva';

type Vista = 'lista' | 'detalle' | 'formulario';

type Filtro = 'Todas' | EstadoMateria;

interface Materia {
  id_materia: number;
  clave_materia: string;
  nombre: string;
  creditos: number;
  horas_teoricas: number;
  horas_practicas: number;
  id_materia_requisito: number | null;

  clave_requisito?: string | null;
  nombre_requisito?: string | null;

  estado: EstadoMateria;
}

interface FormularioMateria {
  clave_materia: string;
  nombre: string;
  creditos: number | null;
  horas_teoricas: number | null;
  horas_practicas: number | null;
  id_materia_requisito: number | null;
  estado: EstadoMateria;
}

interface RespuestaApi {
  success: boolean;
  message?: string;
}

interface RespuestaListado extends RespuestaApi {
  materias?: Materia[];
  data?: Materia[];
}

interface RespuestaConsulta extends RespuestaApi {
  materia?: Materia;
  data?: Materia;
}

// ========================================
// FORMULARIO INICIAL
// ========================================

function formularioVacio(): FormularioMateria {
  return {
    clave_materia: '',
    nombre: '',
    creditos: null,
    horas_teoricas: 0,
    horas_practicas: 0,
    id_materia_requisito: null,
    estado: 'Activa',
  };
}

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

@Component({
  selector: 'app-materias',
  standalone: true,
  templateUrl: './materias.page.html',
  styleUrls: ['./materias.page.scss'],

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
export class MateriasPage {

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

  materias: Materia[] = [];

  seleccionada: Materia | null = null;

  formulario: FormularioMateria = formularioVacio();

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
  // PERMISOS
  // ======================================

  get esAdmin(): boolean {
    return this.auth.obtenerUsuario()?.rol === 'Admin';
  }

  // ======================================
  // ENTRADA AL MÓDULO
  // ======================================

  ionViewWillEnter(): void {

    if (!this.auth.obtenerUsuario()) {

      void this.router.navigateByUrl('/login', {
        replaceUrl: true,
      });

      return;
    }

    this.vista = 'lista';
    this.cargarMaterias();
  }

  // ======================================
  // BÚSQUEDA Y FILTROS
  // ======================================

  get materiasFiltradas(): Materia[] {

    const texto = this.busqueda.trim().toLowerCase();

    return this.materias.filter(m => {

      if (
        this.filtro !== 'Todas' &&
        m.estado !== this.filtro
      ) {
        return false;
      }

      if (!texto) return true;

      return [
        m.clave_materia,
        m.nombre,
        m.clave_requisito,
        m.nombre_requisito,
      ].some(valor =>
        String(valor ?? '')
          .toLowerCase()
          .includes(texto)
      );

    });
  }

  // ======================================
  // OPCIONES DE PRERREQUISITOS
  // ======================================

  get requisitosDisponibles(): Materia[] {

    const idActual = this.editando
      ? this.seleccionada?.id_materia
      : null;

    return this.materias.filter(m =>

      m.id_materia !== idActual &&

      (
        m.estado === 'Activa' ||
        m.id_materia === Number(
          this.formulario.id_materia_requisito
        )
      )

    );
  }

  // ======================================
  // LISTAR MATERIAS
  // GET: materias/listar.php
  // ======================================

  cargarMaterias(
    refresher?: HTMLIonRefresherElement
  ): void {

    this.errorLista = '';

    if (!refresher) {
      this.cargando = true;
    }

    this.http.get<RespuestaListado>(
      `${this.api}/materias/listar.php`,
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

        const registros =
          respuesta.materias ?? respuesta.data;

        if (
          !respuesta.success ||
          !Array.isArray(registros)
        ) {

          this.materias = [];

          this.errorLista =
            respuesta.message ||
            'No se pudieron cargar las materias.';

          return;
        }

        this.materias = registros.map(m => ({
          ...m,

          id_materia: Number(m.id_materia),

          creditos: Number(m.creditos),

          horas_teoricas: Number(m.horas_teoricas),

          horas_practicas: Number(m.horas_practicas),

          id_materia_requisito:
            m.id_materia_requisito == null
              ? null
              : Number(m.id_materia_requisito),
        }));

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {

        this.materias = [];

        this.errorLista = this.mensajeError(error);
      },

    });
  }

  // ======================================
  // REFRESCAR LISTADO
  // ======================================

  refrescar(evento: Event): void {

    this.cargarMaterias(
      evento.target as HTMLIonRefresherElement
    );
  }

  // ======================================
  // CONSULTAR MATERIA
  // GET: materias/consultar.php
  // ======================================

  abrirDetalle(materia: Materia): void {

    if (this.cargandoDetalle) return;

    this.cargandoDetalle = true;
    this.errorDetalle = '';

    this.http.get<RespuestaConsulta>(
      `${this.api}/materias/consultar.php`,
      {
        params: {
          id_materia: String(materia.id_materia),
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

        const registro =
          respuesta.materia ?? respuesta.data;

        if (
          !respuesta.success ||
          !registro?.id_materia
        ) {

          this.errorDetalle =
            respuesta.message ||
            'No se pudo consultar la materia.';

          return;
        }

        this.seleccionada = {
          ...registro,

          id_materia: Number(registro.id_materia),

          creditos: Number(registro.creditos),

          horas_teoricas:
            Number(registro.horas_teoricas),

          horas_practicas:
            Number(registro.horas_practicas),

          id_materia_requisito:
            registro.id_materia_requisito == null
              ? null
              : Number(registro.id_materia_requisito),
        };

        this.vista = 'detalle';

        this.cdr.markForCheck();
      },

      error: (error: HttpErrorResponse) => {

        this.errorDetalle = this.mensajeError(error);
      },

    });
  }

  // ======================================
  // NUEVA MATERIA
  // ======================================

  nueva(): void {

    if (!this.esAdmin) return;

    this.seleccionada = null;

    this.formulario = formularioVacio();

    this.editando = false;
    this.errorFormulario = '';

    this.vista = 'formulario';
  }

  // ======================================
  // EDITAR MATERIA
  // ======================================

  editar(): void {

    if (!this.esAdmin || !this.seleccionada) {
      return;
    }

    const m = this.seleccionada;

    this.formulario = {

      clave_materia: m.clave_materia,
      nombre: m.nombre,

      creditos: Number(m.creditos),

      horas_teoricas: Number(m.horas_teoricas),

      horas_practicas: Number(m.horas_practicas),

      id_materia_requisito:
        m.id_materia_requisito,

      estado: m.estado,
    };

    this.editando = true;
    this.errorFormulario = '';

    this.vista = 'formulario';
  }

  // ======================================
  // REGRESAR
  // ======================================

  regresar(): void {

    if (this.guardando || this.desactivando) {
      return;
    }

    this.errorFormulario = '';
    this.errorDetalle = '';

    this.vista =
      this.vista === 'formulario' &&
      this.editando &&
      this.seleccionada
        ? 'detalle'
        : 'lista';
  }

  // ======================================
  // GUARDAR MATERIA
  // POST: registrar.php / actualizar.php
  // ======================================

  guardar(): void {

    if (!this.esAdmin || this.guardando) {
      return;
    }

    this.errorFormulario = '';

    const f = this.formulario;

    // Normalizar datos

    const clave_materia =
      f.clave_materia.trim().toUpperCase();

    const nombre = f.nombre.trim();

    const creditos = Number(f.creditos);

    const horas_teoricas =
      Number(f.horas_teoricas);

    const horas_practicas =
      Number(f.horas_practicas);

    const id_materia_requisito =
      f.id_materia_requisito == null ||
      String(f.id_materia_requisito).trim() === ''
        ? null
        : Number(f.id_materia_requisito);

    // Validar campos obligatorios

    if (!clave_materia || !nombre) {

      this.errorFormulario =
        'La clave y el nombre son obligatorios.';

      return;
    }

    if (
      clave_materia.length > 15 ||
      nombre.length > 150
    ) {

      this.errorFormulario =
        'La clave permite 15 caracteres y ' +
        'el nombre 150 como máximo.';

      return;
    }

    // Validar créditos

    if (
      f.creditos === null ||
      !Number.isInteger(creditos) ||
      creditos < 3 ||
      creditos > 6
    ) {

      this.errorFormulario =
        'Los créditos deben ser un número ' +
        'entero entre 3 y 6.';

      return;
    }

    // Validar horas

    if (
      f.horas_teoricas === null ||
      f.horas_practicas === null ||
      !Number.isInteger(horas_teoricas) ||
      !Number.isInteger(horas_practicas) ||
      horas_teoricas < 0 ||
      horas_practicas < 0
    ) {

      this.errorFormulario =
        'Las horas deben ser números enteros ' +
        'mayores o iguales a cero.';

      return;
    }

    // Validar prerrequisito

    if (
      id_materia_requisito !== null &&
      (
        !Number.isInteger(id_materia_requisito) ||
        id_materia_requisito <= 0 ||
        !this.requisitosDisponibles.some(
          m => m.id_materia === id_materia_requisito
        )
      )
    ) {

      this.errorFormulario =
        'Selecciona un prerrequisito válido.';

      return;
    }

    // No permitir autorreferencia

    if (
      this.editando &&
      id_materia_requisito ===
        this.seleccionada?.id_materia
    ) {

      this.errorFormulario =
        'Una materia no puede ser ' +
        'prerrequisito de sí misma.';

      return;
    }

    if (this.editando && !this.seleccionada) {
      return;
    }

    // Preparar JSON

    const cuerpo = {

      ...(this.editando
        ? {
            id_materia:
              this.seleccionada!.id_materia,
          }
        : {}),

      clave_materia,
      nombre,
      creditos,
      horas_teoricas,
      horas_practicas,
      id_materia_requisito,
      estado: f.estado,
    };

    const accion = this.editando
      ? 'actualizar'
      : 'registrar';

    this.guardando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/materias/${accion}.php`,
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
            'No se pudo guardar la materia.';

          return;
        }

        void this.mostrarToast(
          respuesta.message ||
          'Materia guardada correctamente.'
        );

        this.vista = 'lista';
        this.seleccionada = null;

        this.cargarMaterias();
      },

      error: (error: HttpErrorResponse) => {

        this.errorFormulario =
          this.mensajeError(error);
      },

    });
  }

  // ======================================
  // CONFIRMAR DESACTIVACIÓN
  // ======================================

  async confirmarDesactivacion(): Promise<void> {

    if (
      !this.esAdmin ||
      !this.seleccionada ||
      this.desactivando ||
      this.seleccionada.estado === 'Inactiva'
    ) {
      return;
    }

    const alerta = await this.alertas.create({

      header: 'Desactivar materia',

      message:
        `¿Deseas desactivar ` +
        `${this.seleccionada.nombre}? ` +
        `No se eliminará su información.`,

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
  // DESACTIVAR MATERIA
  // POST: materias/eliminar.php
  // ======================================

  private desactivar(): void {

    if (!this.esAdmin || !this.seleccionada) {
      return;
    }

    this.desactivando = true;

    this.http.post<RespuestaApi>(
      `${this.api}/materias/eliminar.php`,
      {
        id_materia: this.seleccionada.id_materia,
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
          'Materia desactivada.'
        );

        this.seleccionada = null;
        this.vista = 'lista';

        this.cargarMaterias();
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
        'No fue posible conectar con la API. ' +
        'Verifica tu red y el servidor.'
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
