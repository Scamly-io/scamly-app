import { LinearGradient } from 'expo-linear-gradient';

export default function HalfGradientDivider() {
    return (
        <LinearGradient
            colors={['transparent', '#D8B4FE', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{
                height: 1,
                flex: 1,
            }}
        />
    );
}
