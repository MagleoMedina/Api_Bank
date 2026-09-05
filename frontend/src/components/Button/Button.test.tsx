import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { Button } from './Button';

function findText(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return typeof node === 'string' ? node : '';
  }
  if (Array.isArray(node)) {
    return node.map(findText).join('');
  }
  return findText((node as { children?: unknown }).children);
}

function hostButtons(
  renderer: ReactTestRenderer.ReactTestRenderer,
): ReactTestRenderer.ReactTestInstance[] {
  return renderer.root.findAll(
    (node) =>
      typeof node.type === 'string' &&
      node.props.accessibilityRole === 'button',
  );
}

test('muestra el texto del botón con rol y estado accesible', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <Button label="Consultar" onPress={() => undefined} variant="primary" />
      </ThemeProvider>,
    );
  });

  const text = findText(renderer.toJSON());
  expect(text).toBe('Consultar');

  const [button] = hostButtons(renderer);
  expect(button).toBeDefined();
  expect(button.props.accessibilityState).toEqual({ disabled: false });
});

test('deshabilita el botón y lo refleja en el estado accesible', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <Button label="Consultar" onPress={() => undefined} disabled />
      </ThemeProvider>,
    );
  });

  const [button] = hostButtons(renderer);
  expect(button).toBeDefined();
  expect(button.props.accessibilityState).toEqual({ disabled: true });
});