const esbuild = require('esbuild');
const path = require('path');

const rebuildPlugin = {
  name: 'rebuild-plugin',
  setup(build) {
    build.onStart(() => {
      console.log('Build started...');
    });

    build.onEnd((result) => {
      if (result.errors.length === 0) {
        console.log('Build completed successfully.');
      }
    });
  },
};

async function esbuilder() {
  const ctx = await esbuild.context({
    entryPoints: [path.join(__dirname, 'src', 'index.js')],
    bundle: true,
    outfile: path.join(__dirname, 'dist', 'bundle.js'),
    format: 'esm',
    sourcemap: true,
    minify: false,
    plugins: [rebuildPlugin], // Use the rebuild plugin here
    loader: {
      '.js': 'jsx',
      '.jsx': 'jsx',
    },
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  });

  await ctx.watch();

  console.log('Esbuilder watching...');

  // Function to dispose of context on exit
  function exitGracefully() {
    console.log('Disposing of context.');

    ctx
      .dispose()
      .then(() => {
        console.log('Disposed of context successfully.');
        process.exit(0);
      })
      .catch((error) => {
        console.log(
          'Error occurred while disposing of context: ' + error.message,
        );
        process.exit(1);
      });
  }

  // Handle SIGINT and SIGTERM gracefully
  process.on('SIGINT', exitGracefully);
  process.on('SIGTERM', exitGracefully);
}

// Start the esbuild process
esbuilder().catch((err) => {
  console.error('Error occurred: ' + err.message);
});
