import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-contratos',
  templateUrl: './contratos.page.html',
  styleUrls: ['./contratos.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule],
})
export class ContratosPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
