import '@/web-app-ox/test/setup'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SetupPanel from '@/web-app-ox/features/game/SetupPanel'

function setup(props: Partial<React.ComponentProps<typeof SetupPanel>> = {}) {
  const onChange = vi.fn()
  const onStart = vi.fn()
  render(<SetupPanel difficulty="easy" onChange={onChange} onStart={onStart} starting={false} {...props} />)
  return { onChange, onStart }
}

describe('SetupPanel (UI-2)', () => {
  it('shows Easy and Hard as radios with the current one checked', () => {
    setup({ difficulty: 'hard' })
    expect(screen.getByRole('radiogroup', { name: 'Choose difficulty' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Easy/ })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: /Hard/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Selected')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Hard/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: /Easy/ })).toHaveAttribute('tabindex', '-1')
  })

  it('reports a click on an option', async () => {
    const { onChange } = setup()
    await userEvent.click(screen.getByRole('radio', { name: /Hard/ }))
    expect(onChange).toHaveBeenCalledWith('hard')
  })

  it.each(['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'])('%s switches to the other level and focuses it', async (key) => {
    const { onChange } = setup({ difficulty: 'easy' })
    screen.getByRole('radio', { name: /Easy/ }).focus()
    await userEvent.keyboard(`{${key}}`)
    expect(onChange).toHaveBeenCalledWith('hard')
    expect(screen.getByRole('radio', { name: /Hard/ })).toHaveFocus()
  })

  it('switches from Hard back to Easy by keyboard', async () => {
    const { onChange } = setup({ difficulty: 'hard' })
    screen.getByRole('radio', { name: /Hard/ }).focus()
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith('easy')
  })

  it('ignores other keys', async () => {
    const { onChange } = setup()
    screen.getByRole('radio', { name: /Easy/ }).focus()
    await userEvent.keyboard('a')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('starts with the default or a custom label', async () => {
    const first = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Start game' }))
    expect(first.onStart).toHaveBeenCalledTimes(1)
  })

  it('uses a custom start label', () => {
    setup({ startLabel: 'Start new game' })
    expect(screen.getByRole('button', { name: 'Start new game' })).toBeInTheDocument()
  })

  it('disables everything and ignores the keyboard while starting', async () => {
    const { onChange, onStart } = setup({ starting: true })
    expect(screen.getByRole('radio', { name: /Easy/ })).toBeDisabled()
    expect(screen.getByRole('radio', { name: /Hard/ })).toBeDisabled()
    const start = screen.getByRole('button', { name: 'Starting…' })
    expect(start).toBeDisabled()
    await userEvent.click(start)
    expect(onStart).not.toHaveBeenCalled()
    const easy = screen.getByRole('radio', { name: /Easy/ })
    easy.focus()
    // disabled buttons cannot take focus; fire the key on the element directly
    easy.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
