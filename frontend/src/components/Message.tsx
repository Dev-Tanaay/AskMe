interface MessageProps{
    message: string;
}
const Message = ({message}:MessageProps) => {
  return (
    <div className="max-w-[70%]">
      <p className="bg-green-100 p-3 text-lg border-2 border-green-100 rounded-xl break-words">{message}</p>
    </div>
  )
}

export default Message