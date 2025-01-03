import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

export const pane = new Pane();
pane.registerPlugin(EssentialsPlugin);
export const info = pane.addFolder({ title: 'Info', expanded: false });
export const settings = pane.addFolder({ title: 'Settings', expanded: false });
export const nextBtn = settings.addButton({ title: 'Next mesh >>', index: 0 });
settings.addBlade({ view: 'separator', index: 1 });
