import { processBarcode }
from '../core/processBarcode.js';

export function registerMockScanner() {

    window.addEventListener('keydown', (event) => {

        if (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toLowerCase() === 's'
        ) {

            event.preventDefault();

            const mock =
                "QA-MOCK-" +
                Math.floor(100000 + Math.random() * 900000).toString();

            let i = 0;
            function fire() {

                if (i < mock.length) {

                    window.dispatchEvent(
                        new KeyboardEvent('keydown', {
                            key: mock[i]
                        })
                    );

                    i++;
                    setTimeout(fire, 4);

                } else {

                    window.dispatchEvent(
                        new KeyboardEvent('keydown', {
                            key: 'Enter'
                        })
                    );
                }
            }
            fire();
        }
    });
}