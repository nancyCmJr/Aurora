import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReticulasPage } from './reticulas.page';

describe('ReticulasPage', () => {
  let component: ReticulasPage;
  let fixture: ComponentFixture<ReticulasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReticulasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
