import { ArrowRight } from 'lucide-react';
import { buttonPressProps } from './dailyRitualUtils';

const RitualNavigation = ({ goBack, goNext, handleFinish, stepIndex, stepCount }) => (
                        <div className="flex items-center justify-between border-t border-[var(--color-rule)] px-5 py-4 sm:px-7">
                            <button
                                type="button"
                                {...buttonPressProps(goBack)}
                                disabled={stepIndex === 0}
                                className="rounded-2xl px-4 py-2 text-sm font-bold text-[var(--color-muted)] transition-colors hover:bg-[var(--color-paper-2)] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Back
                            </button>
                            {stepIndex < stepCount - 1 ? (
                                <button
                                    type="button"
                                    {...buttonPressProps(goNext)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-ink)] px-5 py-2.5 text-sm font-bold text-[var(--color-paper)] transition-colors hover:opacity-90"
                                >
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    {...buttonPressProps(handleFinish)}
                                    className="rounded-2xl bg-[var(--color-ink)] px-5 py-2.5 text-sm font-bold text-[var(--color-paper)] transition-colors hover:opacity-90"
                                >
                                    Done
                                </button>
                            )}
                        </div>
);

export default RitualNavigation;
