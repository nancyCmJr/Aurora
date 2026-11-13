import type { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'alumnos',
    canActivate: [authGuard],
    loadComponent: () => import('./alumnos/alumnos.page').then((m) => m.AlumnosPage),
  },
  {
    path: 'areas',
    canActivate: [authGuard],
    loadComponent: () => import('./areas/areas.page').then((m) => m.AreasPage),
  },
  {
    path: 'carreras',
    canActivate: [authGuard],
    loadComponent: () => import('./carreras/carreras.page').then((m) => m.CarrerasPage),
  },
  {
    path: 'contratos',
    canActivate: [authGuard],
    loadComponent: () => import('./contratos/contratos.page').then((m) => m.ContratosPage),
  },
  {
    path: 'docentes',
    canActivate: [authGuard],
    loadComponent: () => import('./docentes/docentes.page').then((m) => m.DocentesPage),
  },
  {
    path: 'grupos',
    canActivate: [authGuard],
    loadComponent: () => import('./grupos/grupos.page').then((m) => m.GruposPage),
  },
  {
    path: 'horarios',
    canActivate: [authGuard],
    loadComponent: () => import('./horarios/horarios.page').then((m) => m.HorariosPage),
  },
  {
    path: 'kardex',
    canActivate: [authGuard],
    loadComponent: () => import('./kardex/kardex.page').then((m) => m.KardexPage),
  },
  {
    path: 'materias',
    canActivate: [authGuard],
    loadComponent: () => import('./materias/materias.page').then((m) => m.MateriasPage),
  },
  {
    path: 'reticulas',
    canActivate: [authGuard],
    loadComponent: () => import('./reticulas/reticulas.page').then((m) => m.ReticulasPage),
  },
  {
    path: 'salones',
    canActivate: [authGuard],
    loadComponent: () => import('./salones/salones.page').then((m) => m.SalonesPage),
  },
  {
    path: 'usuarios',
    canActivate: [authGuard],
    loadComponent: () => import('./usuarios/usuarios.page').then((m) => m.UsuariosPage),
  },
  { path: '**', redirectTo: 'login' },
];
