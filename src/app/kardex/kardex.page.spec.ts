import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KardexPage } from './kardex.page';

describe('KardexPage', () => {
  let component: KardexPage;
  let fixture: ComponentFixture<KardexPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(KardexPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
