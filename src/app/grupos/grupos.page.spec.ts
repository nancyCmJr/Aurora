import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GruposPage } from './grupos.page';

describe('GruposPage', () => {
  let component: GruposPage;
  let fixture: ComponentFixture<GruposPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GruposPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
