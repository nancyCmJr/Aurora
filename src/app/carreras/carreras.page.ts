import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-carreras',
  templateUrl: './carreras.page.html',
  styleUrls: ['./carreras.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule],
})
export class CarrerasPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
