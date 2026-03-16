import { useAppSelector } from '../../constants/hooks';
import { RootState } from '../../constants/store';
import './counter-panel.css';

interface PropTypes {
    counterId: string,
    onClick: any
}

export const CounterPanel = (props: PropTypes) => {
    const counters = useAppSelector((state: RootState) => state.counters);

    const counter = counters[props.counterId];

    const imageUrl = `/images/${counter.imageName}.png`;

    const imageClass = ''; //(counter.ghost) ? 'ghost' : '';

    const panelClass = counter.selected ? 'counter-panel selected': 'counter-panel';

    const handleClick = () => {
        if (props.onClick !== undefined) {
            props.onClick(props.counterId);
        }
    }

    return(
        <div className={panelClass} onClick={handleClick}>
            <img className={imageClass} src={imageUrl} alt={counter.imageName} />
        </div>
    )
}