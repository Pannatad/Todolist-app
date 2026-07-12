import { ArrowRight } from 'lucide-react';
import { buttonPressProps } from './dailyRitualUtils';

const RitualNavigation = ({ goBack, goNext, handleFinish, stepIndex, stepCount }) => (
                        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 sm:px-7">
                            <button
                                type="button"
                                {...buttonPressProps(goBack)}
                                disabled={stepIndex === 0}
                                className="rounded-2xl px-4 py-2 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Back
                            </button>
                            {stepIndex < stepCount - 1 ? (
                                <button
                                    type="button"
                                    {...buttonPressProps(goNext)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                                >
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    {...buttonPressProps(handleFinish)}
                                    className="rounded-2xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                                >
                                    Done
                                </button>
                            )}
                        </div>
);

export default RitualNavigation;
