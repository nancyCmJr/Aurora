import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContratosPage } from './contratos.page';

describe('ContratosPage', () => {
  let component: ContratosPage;
  let fixture: ComponentFixture<ContratosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ContratosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
