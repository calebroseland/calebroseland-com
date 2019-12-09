import TransitionDescriptor from '@/components/transitions/TransitionDescriptor'

describe('TransitionDescriptor', () => {
  it('works with effect string', () => {
    const { enterClass, leaveClass } = TransitionDescriptor.from({
      effect: 'fade'
    })
      .toAnimateClasses()

    expect(enterClass).toBe('fadeIn')
    expect(leaveClass).toBe('fadeOut')
  })

  it('works with effect func', () => {
    const { enterClass, leaveClass } = TransitionDescriptor.from({
      effect: () => 'fade'
    })
      .toAnimateClasses()

    expect(enterClass).toBe('fadeIn')
    expect(leaveClass).toBe('fadeOut')
  })

  it('works with effect and (universal) enter+leave direction', () => {
    const { enterClass, leaveClass } = TransitionDescriptor.from({
      effect: 'fade',
      direction: 'up'
    })
      .toAnimateClasses()

    expect(enterClass).toBe('fadeInUp')
    expect(leaveClass).toBe('fadeOutUp')
  })

  it('works with effect and (two-way) enter+leave direction', () => {
    const { enterClass, leaveClass } = TransitionDescriptor.from({
      effect: 'fade',
      direction: 'up-down'
    })
      .toAnimateClasses()

    expect(enterClass).toBe('fadeInUp')
    expect(leaveClass).toBe('fadeOutDown')
  })

  it('works with effect and (one-way) enter direction', () => {
    const { enterClass, leaveClass } = TransitionDescriptor.from({
      effect: 'fade',
      direction: 'up-'
    })
      .toAnimateClasses()

    expect(enterClass).toBe('fadeInUp')
    expect(leaveClass).toBe('fadeOut')
  })

  it('works with effect and (one-way) leave direction', () => {
    const { enterClass, leaveClass } = TransitionDescriptor.from({
      effect: 'fade',
      direction: '-down'
    })
      .toAnimateClasses()

    expect(enterClass).toBe('fadeIn')
    expect(leaveClass).toBe('fadeOutDown')
  })

  it('works with effect, static enter direction, and leaveClass func', () => {
    const { enterClass, leaveClass } = TransitionDescriptor.from({
      effect: 'slide',
      direction: 'right-',
      leaveClass: () => 'slideOutLeft'
    })
      .toAnimateClasses()

    expect(enterClass).toBe('slideInRight')
    expect(leaveClass).toBe('slideOutLeft')
  })

  it('works with effect, static leave direction, and enterClass func', () => {
    const { enterClass, leaveClass } = TransitionDescriptor.from({
      effect: 'slide',
      direction: '-left',
      enterClass: () => 'slideInRight'
    })
      .toAnimateClasses()

    expect(enterClass).toBe('slideInRight')
    expect(leaveClass).toBe('slideOutLeft')
  })

  it('works with effect, static leave direction, and leaveClass func with arguments supplied', () => {
    const { enterClass, leaveClass } = TransitionDescriptor.from({
      effect: 'slide',
      direction: '-left',
      enterClass: ({ dependentInfo } : any) => dependentInfo[2] ? 'slideInUp' : 'slideInRight'
    })
      .toAnimateClasses({ dependentInfo: [false, false, true, false] })

    expect(enterClass).toBe('slideInUp')
    expect(leaveClass).toBe('slideOutLeft')
  })
})
