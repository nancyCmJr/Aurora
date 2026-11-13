import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-kardex',
  templateUrl: './kardex.page.html',
  styleUrls: ['./kardex.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule],
})
export class KardexPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
