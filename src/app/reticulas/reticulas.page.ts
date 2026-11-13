import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-reticulas',
  templateUrl: './reticulas.page.html',
  styleUrls: ['./reticulas.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule],
})
export class ReticulasPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
