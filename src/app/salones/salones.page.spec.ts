import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SalonesPage } from './salones.page';

describe('SalonesPage', () => {
  let component: SalonesPage;
  let fixture: ComponentFixture<SalonesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SalonesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
