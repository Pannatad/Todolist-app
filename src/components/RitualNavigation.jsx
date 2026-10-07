import { buttonPressProps } from './dailyRitualUtils';

const RitualNavigation = ({ goBack, goNext, handleFinish, stepIndex, stepCount }) => (
    <div className="ritual-nav">
        <button
            type="button"
            {...buttonPressProps(goBack)}
            disabled={stepIndex === 0}
            className="ui-text-button"
        >
            Back
        </button>
        {stepIndex < stepCount - 1 ? (
            <button type="button" {...buttonPressProps(goNext)} className="ui-button ui-button--accent">
                Continue
            </button>
        ) : (
            <button type="button" {...buttonPressProps(handleFinish)} className="ui-button ui-button--accent">
                Done
            </button>
        )}
    </div>
);

export default RitualNavigation;
