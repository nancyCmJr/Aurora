
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import {
  AlertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import {
  businessOutline,
  calendarOutline,
  documentTextOutline,
  gitNetworkOutline,
  logOutOutline,
  peopleOutline,
  personOutline,
  ribbonOutline,
  schoolOutline,
  shieldCheckmarkOutline,
  bookOutline,
  layersOutline,
} from 'ionicons/icons';

import {
  AuthService,
  RolUsuario,
  UsuarioAurora,
} from '../services/auth.service';

interface ModuloMenu {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: string;
  roles: RolUsuario[];
}

interface SeccionMenu {
  titulo: string;
  modulos: ModuloMenu[];
}

// Configuración de módulos y permisos de visualización
const SECCIONES: SeccionMenu[] = [
  {
    titulo: 'Personas y accesos',
    modulos: [
      {
        titulo: 'Usuarios',
        descripcion: 'Cuentas y permisos',
        ruta: '/usuarios',
        icono: 'shield-checkmark-outline',
        roles: ['Admin'],
      },
      {
        titulo: 'Alumnos',
        descripcion: 'Expedientes estudiantiles',
        ruta: '/alumnos',
        icono: 'people-outline',
        roles: ['Admin'],
      },
      {
        titulo: 'Docentes',
        descripcion: 'Personal docente',
        ruta: '/docentes',
        icono: 'person-outline',
        roles: ['Admin'],
      },
    ],
  },
  {
    titulo: 'Gestión académica',
    modulos: [
      {
        titulo: 'Carreras',
        descripcion: 'Programas académicos',
        ruta: '/carreras',
        icono: 'school-outline',
        roles: ['Admin'],
      },
      {
        titulo: 'Materias',
        descripcion: 'Asignaturas',
        ruta: '/materias',
        icono: 'book-outline',
        roles: ['Admin', 'Docente', 'Alumno'],
      },
      {
        titulo: 'Retículas',
        descripcion: 'Planes de estudio',
        ruta: '/reticulas',
        icono: 'git-network-outline',
        roles: ['Admin'],
      },
      {
        titulo: 'Kardex',
        descripcion: 'Historial y calificaciones',
        ruta: '/kardex',
        icono: 'ribbon-outline',
        roles: ['Admin', 'Docente', 'Alumno'],
      },
    ],
  },
  {
    titulo: 'Clases y horarios',
    modulos: [
      {
        titulo: 'Grupos',
        descripcion: 'Grupos y asignaciones',
        ruta: '/grupos',
        icono: 'layers-outline',
        roles: ['Admin', 'Docente'],
      },
      {
        titulo: 'Horarios',
        descripcion: 'Horarios de clases',
        ruta: '/horarios',
        icono: 'calendar-outline',
        roles: ['Admin', 'Docente', 'Alumno'],
      },
    ],
  },
  {
    titulo: 'Instalaciones y personal',
    modulos: [
      {
        titulo: 'Contratos',
        descripcion: 'Contratos del personal',
        ruta: '/contratos',
        icono: 'document-text-outline',
        roles: ['Admin'],
      },
      {
        titulo: 'Áreas',
        descripcion: 'Áreas académicas',
        ruta: '/areas',
        icono: 'business-outline',
        roles: ['Admin'],
      },
      {
        titulo: 'Salones',
        descripcion: 'Aulas y laboratorios',
        ruta: '/salones',
        icono: 'school-outline',
        roles: ['Admin'],
      },
    ],
  },
];

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonBadge,
    IonButton,
    IonButtons,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonListHeader,
    IonTitle,
    IonToolbar,
  ],
})
export class HomePage {

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);

  usuario: UsuarioAurora | null = null;
  secciones: SeccionMenu[] = [];

  constructor() {
    addIcons({
      businessOutline,
      calendarOutline,
      documentTextOutline,
      gitNetworkOutline,
      logOutOutline,
      peopleOutline,
      personOutline,
      ribbonOutline,
      schoolOutline,
      shieldCheckmarkOutline,
      bookOutline,
      layersOutline,
    });
  }

  // Actualizar la información cada vez que se abre Home
  ionViewWillEnter(): void {

    this.usuario = this.auth.obtenerUsuario();

    if (!this.usuario) {
      this.secciones = [];

      void this.router.navigateByUrl('/login', {
        replaceUrl: true,
      });
      return;
    }

    // Mostrar los módulos correspondientes al rol
    const rol = this.usuario.rol;

    this.secciones = SECCIONES
      .map((seccion) => ({
        titulo: seccion.titulo,
        modulos: seccion.modulos.filter(
          (modulo) => modulo.roles.includes(rol)
        ),
      }))
      .filter((seccion) => seccion.modulos.length > 0);
  }

  // Confirmación antes de cerrar sesión
  async confirmarCerrarSesion(): Promise<void> {

    const alerta = await this.alertController.create({
      header: 'Cerrar sesión',
      message: '¿Deseas salir de Aurora?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          role: 'destructive',
          handler: () => this.cerrarSesion(),
        },
      ],
    });

    await alerta.present();
  }

  private cerrarSesion(): void {

    this.auth.cerrarSesion();

    this.usuario = null;
    this.secciones = [];

    void this.router.navigateByUrl('/login', {
      replaceUrl: true,
    });
  }
}
