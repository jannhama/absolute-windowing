import tsesLint from 'typescript-eslint';

export default tsesLint.config({
  ignores: ['dist/*', 'node_modules/**/*']
});
