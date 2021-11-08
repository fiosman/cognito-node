import { PaymentElement } from "@stripe/react-stripe-js";
import { CardElement } from "@stripe/react-stripe-js";
const CheckoutForm = () => {
  return (
    <form>
      <PaymentElement />
      <button>Submit</button>
    </form>
  );
  // return <CardElement />;
};

export default CheckoutForm;
