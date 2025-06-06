import { rollup } from 'rollup';
import config from '../rollup.config.mjs';

async function build() {
  try {
    const bundle = await rollup(config);
    await bundle.write(config.output);
    await bundle.close();
    console.log('Rollup: dist/bundle.cjs has been created.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

build();
