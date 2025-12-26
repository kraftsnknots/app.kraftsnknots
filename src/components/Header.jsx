import {
    View, Image, StyleSheet,
} from "react-native";
import LinearGradient from 'react-native-linear-gradient';

export default function Header() {
    return (
        <LinearGradient
            colors={['#000', '#000']}
            style={styles.navbar}>
            <View
                style={styles.navImgs}>

                <Image
                    source={require("../assets/images/knklogo4.png")}
                    style={styles.logoRight}
                />
            </View>
        </LinearGradient >
    )
}

const styles = StyleSheet.create({
    navbar: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 5,
        borderBottomWidth: 2,
        borderBottomColor: "#eee",
        width: "100%",
        paddingTop: 45,
    },
    navImgs: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',

    },
    logoRight: { width: 250, height: 70, objectFit: 'contain' }
})