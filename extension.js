import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const HelloWorldIndicator = GObject.registerClass(
class HelloWorldIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Hello World Indicator', false);

        const label = new St.Label({
            text: 'hello world',
            y_align: Clutter.ActorAlign.CENTER,
            style: 'color: white;',
        });

        this.add_child(label);
    }
});

export default class HelloWorldExtension extends Extension {
    enable() {
        this._indicator = new HelloWorldIndicator();

        // Keep the center clock and right-side indicators untouched.
        Main.panel.addToStatusArea(this.uuid, this._indicator, 1, 'left');
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
