import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './main/main.component';
import { ItemComponent } from './item/item.component';

const routes: Routes = [
  { path: '', component: MainComponent },
  { path: 'receive/:id', component: ItemComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
